"""Cicero API client for legislative district matching.

Calls the Cicero ``/official`` endpoint with lat/lon to retrieve elected
officials and their district assignments in a single 1-credit API call.

See ``doc/CICERO_API.md`` for full reference.
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cicero → Heard level mapping
# ---------------------------------------------------------------------------
CICERO_TO_HEARD_LEVEL: dict[str, str] = {
    "NATIONAL_UPPER": "us_senate",
    "NATIONAL_LOWER": "us_house",
    "STATE_EXEC": "statewide",
    "STATE_UPPER": "state_senate",
    "STATE_LOWER": "state_house",
    "LOCAL_EXEC": "municipal",
    "LOCAL": "municipal",
}

CICERO_BASE_URL = "https://app.cicerodata.com/v3.1"

# District types we request from Cicero (covers all levels we care about)
_DISTRICT_TYPES = [
    "NATIONAL_UPPER",
    "NATIONAL_LOWER",
    "STATE_EXEC",
    "STATE_UPPER",
    "STATE_LOWER",
    "LOCAL_EXEC",
    "LOCAL",
]

# ---------------------------------------------------------------------------
# In-memory cache: (rounded_lat, rounded_lng) → (result, timestamp)
# ---------------------------------------------------------------------------
_cache: dict[tuple[float, float], tuple[dict[str, Any], float]] = {}
_CACHE_TTL_SECONDS = 60 * 60 * 24  # 24 hours


def _cache_key(lat: float, lng: float) -> tuple[float, float]:
    """Round to 3 decimal places (~110m precision) for cache grouping."""
    return (round(lat, 3), round(lng, 3))


def _get_api_key() -> str:
    """Resolve CICERO_API_KEY from environment or .env file."""
    key = os.environ.get("CICERO_API_KEY")
    if key:
        return key

    env_file = Path(__file__).resolve().parents[4] / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line.startswith("CICERO_API_KEY=") and not line.startswith("#"):
                return line.split("=", 1)[1].strip().strip('"').strip("'")

    raise RuntimeError("CICERO_API_KEY not set in environment or .env file")


# ---------------------------------------------------------------------------
# Official parsing
# ---------------------------------------------------------------------------

def _parse_official(official: dict[str, Any]) -> dict[str, Any]:
    """Extract the fields we need from a single Cicero official object."""
    office = official.get("office", {})
    district = office.get("district", {})
    district_type = district.get("district_type", "")
    district_id = district.get("district_id", "")

    # Determine Heard level
    heard_level = CICERO_TO_HEARD_LEVEL.get(district_type, "")
    if heard_level == "municipal" and _is_at_large(district_id):
        heard_level = "municipal_at_large"

    # Build address info from first address entry
    addresses = official.get("addresses", [])
    first_addr = addresses[0] if addresses else {}

    return {
        "cicero_id": official.get("id"),
        "first_name": official.get("first_name", ""),
        "last_name": official.get("last_name", ""),
        "name": f"{official.get('first_name', '')} {official.get('last_name', '')}".strip(),
        "party": official.get("party", ""),
        "title": office.get("title", ""),
        "heard_level": heard_level,
        "district_type": district_type,
        "district_id": district_id,
        "district_label": district.get("label", ""),
        "state": district.get("state", ""),
        "emails": official.get("email_addresses", []),
        "web_form_url": official.get("web_form_url", ""),
        "photo_url": official.get("photo_origin_url", ""),
        "urls": official.get("urls", []),
        "phone": first_addr.get("phone_1", ""),
        "office_city": first_addr.get("city", ""),
        "chamber_name": office.get("chamber", {}).get("name_formal", ""),
    }


def _is_at_large(district_id: str) -> bool:
    """Check if a district_id represents an at-large seat."""
    normalized = district_id.strip().lower().replace("-", " ").replace("_", " ")
    return normalized in ("at large", "at-large", "at_large")


# ---------------------------------------------------------------------------
# District extraction
# ---------------------------------------------------------------------------

def _extract_districts(officials: list[dict[str, Any]]) -> dict[str, Any]:
    """Extract district assignments from a list of parsed officials.

    Returns a dict with keys matching user_profile district columns.
    """
    districts: dict[str, Any] = {
        "council_district": None,
        "state_house_dist": None,
        "state_senate_dist": None,
        "congressional_dist": None,
        "state": None,
        "city": None,
        "county": None,
    }

    for off in officials:
        level = off["heard_level"]
        did = off["district_id"]
        state = off.get("state", "")

        # Always grab state from any official
        if state and not districts["state"]:
            districts["state"] = state

        # Grab city from LOCAL officials
        if level in ("municipal", "municipal_at_large") and off.get("office_city"):
            if not districts["city"]:
                districts["city"] = off["office_city"]

        if level == "municipal" and did:
            districts["council_district"] = did
        elif level == "state_house" and did:
            districts["state_house_dist"] = did
        elif level == "state_senate" and did:
            districts["state_senate_dist"] = did
        elif level == "us_house" and did:
            districts["congressional_dist"] = did

    return districts


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def locate(lat: float, lng: float) -> dict[str, Any]:
    """Look up elected officials and districts for a lat/lng coordinate.

    Returns:
        {
            "districts": { council_district, state_house_dist, ... },
            "officials": [ { name, party, title, heard_level, ... }, ... ],
            "cached": bool,
        }
    """
    key = _cache_key(lat, lng)
    now = time.time()

    # Check cache
    if key in _cache:
        result, ts = _cache[key]
        if now - ts < _CACHE_TTL_SECONDS:
            return {**result, "cached": True}
        del _cache[key]

    # Call Cicero API
    api_key = _get_api_key()
    params: dict[str, Any] = {
        "lat": lat,
        "lon": lng,
        "format": "json",
        "key": api_key,
        "district_type": _DISTRICT_TYPES,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(f"{CICERO_BASE_URL}/official", params=params)
        resp.raise_for_status()
        data = resp.json()

    # Parse response — lat/lon query returns flat results (no candidates wrapper)
    response_body = data.get("response", {})
    errors = response_body.get("errors", [])
    if errors:
        logger.error("Cicero API errors: %s", errors)
        raise RuntimeError(f"Cicero API error: {errors}")

    results = response_body.get("results", {})

    # Handle both flat (lat/lon) and candidates-wrapped (address) responses
    if "candidates" in results:
        candidates = results["candidates"]
        if not candidates:
            raise RuntimeError("Cicero API returned no candidates for this location")
        raw_officials = candidates[0].get("officials", [])
    else:
        raw_officials = results.get("officials", [])

    # Parse each official
    officials = [_parse_official(o) for o in raw_officials]

    # Extract district assignments
    districts = _extract_districts(officials)

    result = {
        "districts": districts,
        "officials": officials,
    }

    # Cache the result
    _cache[key] = (result, now)

    logger.info(
        "Cicero lookup: lat=%.4f lng=%.4f → %d officials, districts=%s",
        lat, lng, len(officials), districts,
    )

    return {**result, "cached": False}


def clear_cache() -> int:
    """Clear the location cache. Returns number of entries removed."""
    count = len(_cache)
    _cache.clear()
    return count
