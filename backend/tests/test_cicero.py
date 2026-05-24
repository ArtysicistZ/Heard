"""Tests for the Cicero API client — district parsing, at-large handling, caching."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from app.gateway.cicero_service import (
    _extract_districts,
    _is_at_large,
    _parse_official,
    clear_cache,
    locate,
)

# ---------------------------------------------------------------------------
# Sample Cicero response (based on verified Philadelphia City Hall results)
# ---------------------------------------------------------------------------

_SAMPLE_OFFICIALS_RAW = [
    {
        "id": 1,
        "first_name": "John",
        "last_name": "Fetterman",
        "party": "Democrat",
        "email_addresses": [],
        "web_form_url": "https://fetterman.senate.gov/contact",
        "photo_origin_url": "",
        "urls": [],
        "addresses": [{"city": "Philadelphia", "state": "PA", "phone_1": "215-241-1090"}],
        "office": {
            "title": "Senator",
            "district": {"district_type": "NATIONAL_UPPER", "district_id": "PA", "label": "US Senate PA", "state": "PA"},
            "chamber": {"name_formal": "United States Senate"},
        },
        "identifiers": [],
    },
    {
        "id": 2,
        "first_name": "Dwight",
        "last_name": "Evans",
        "party": "Democrat",
        "email_addresses": ["evans@mail.house.gov"],
        "web_form_url": "",
        "photo_origin_url": "",
        "urls": [],
        "addresses": [{"city": "Philadelphia", "state": "PA", "phone_1": "215-276-0340"}],
        "office": {
            "title": "Representative",
            "district": {"district_type": "NATIONAL_LOWER", "district_id": "3", "label": "PA Congressional 3", "state": "PA"},
            "chamber": {"name_formal": "US House"},
        },
        "identifiers": [],
    },
    {
        "id": 3,
        "first_name": "Nikil",
        "last_name": "Saval",
        "party": "Democrat",
        "email_addresses": [],
        "web_form_url": "",
        "photo_origin_url": "",
        "urls": [],
        "addresses": [{"city": "Harrisburg", "state": "PA", "phone_1": "717-787-1427"}],
        "office": {
            "title": "Senator",
            "district": {"district_type": "STATE_UPPER", "district_id": "1", "label": "PA Senate 1", "state": "PA"},
            "chamber": {"name_formal": "PA Senate"},
        },
        "identifiers": [],
    },
    {
        "id": 4,
        "first_name": "Ben",
        "last_name": "Waxman",
        "party": "Democrat",
        "email_addresses": [],
        "web_form_url": "https://www.pahouse.com/Waxman/Contact",
        "photo_origin_url": "",
        "urls": [],
        "addresses": [{"city": "Philadelphia", "state": "PA", "phone_1": "215-246-1501"}],
        "office": {
            "title": "Representative",
            "district": {"district_type": "STATE_LOWER", "district_id": "182", "label": "PA House 182", "state": "PA"},
            "chamber": {"name_formal": "PA House"},
        },
        "identifiers": [],
    },
    {
        "id": 5,
        "first_name": "Jeffery",
        "last_name": "Young",
        "party": "Democrat",
        "email_addresses": [],
        "web_form_url": "",
        "photo_origin_url": "",
        "urls": [],
        "addresses": [{"city": "Philadelphia", "state": "PA", "phone_1": "215-686-3442"}],
        "office": {
            "title": "Council Member",
            "district": {"district_type": "LOCAL", "district_id": "5", "label": "Phila Council 5", "state": "PA"},
            "chamber": {"name_formal": "Philadelphia City Council"},
        },
        "identifiers": [],
    },
    {
        "id": 6,
        "first_name": "Nina",
        "last_name": "Ahmad",
        "party": "Democrat",
        "email_addresses": [],
        "web_form_url": "",
        "photo_origin_url": "",
        "urls": [],
        "addresses": [{"city": "Philadelphia", "state": "PA", "phone_1": "215-686-3450"}],
        "office": {
            "title": "Council Member",
            "district": {"district_type": "LOCAL", "district_id": "At Large", "label": "Phila Council At-Large", "state": "PA"},
            "chamber": {"name_formal": "Philadelphia City Council"},
        },
        "identifiers": [],
    },
]


def _mock_cicero_response() -> dict:
    """Build a mock Cicero API response (flat, lat/lon query)."""
    return {
        "response": {
            "errors": [],
            "messages": [],
            "results": {
                "count": {"from": 0, "to": len(_SAMPLE_OFFICIALS_RAW) - 1, "total": len(_SAMPLE_OFFICIALS_RAW)},
                "officials": _SAMPLE_OFFICIALS_RAW,
            },
        }
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_is_at_large():
    assert _is_at_large("At Large")
    assert _is_at_large("at-large")
    assert _is_at_large("At_Large")
    assert not _is_at_large("5")
    assert not _is_at_large("PA")
    assert not _is_at_large("182")


def test_parse_official_us_senate():
    parsed = _parse_official(_SAMPLE_OFFICIALS_RAW[0])
    assert parsed["name"] == "John Fetterman"
    assert parsed["heard_level"] == "us_senate"
    assert parsed["district_id"] == "PA"
    assert parsed["party"] == "Democrat"


def test_parse_official_us_house():
    parsed = _parse_official(_SAMPLE_OFFICIALS_RAW[1])
    assert parsed["name"] == "Dwight Evans"
    assert parsed["heard_level"] == "us_house"
    assert parsed["district_id"] == "3"
    assert parsed["emails"] == ["evans@mail.house.gov"]


def test_parse_official_state_senate():
    parsed = _parse_official(_SAMPLE_OFFICIALS_RAW[2])
    assert parsed["heard_level"] == "state_senate"
    assert parsed["district_id"] == "1"


def test_parse_official_state_house():
    parsed = _parse_official(_SAMPLE_OFFICIALS_RAW[3])
    assert parsed["heard_level"] == "state_house"
    assert parsed["district_id"] == "182"


def test_parse_official_municipal_district():
    parsed = _parse_official(_SAMPLE_OFFICIALS_RAW[4])
    assert parsed["heard_level"] == "municipal"
    assert parsed["district_id"] == "5"


def test_parse_official_at_large():
    parsed = _parse_official(_SAMPLE_OFFICIALS_RAW[5])
    assert parsed["heard_level"] == "municipal_at_large"
    assert parsed["district_id"] == "At Large"


def test_extract_districts():
    officials = [_parse_official(o) for o in _SAMPLE_OFFICIALS_RAW]
    districts = _extract_districts(officials)

    assert districts["state"] == "PA"
    assert districts["congressional_dist"] == "3"
    assert districts["state_senate_dist"] == "1"
    assert districts["state_house_dist"] == "182"
    assert districts["council_district"] == "5"
    assert districts["city"] == "Philadelphia"


@pytest.fixture(autouse=True)
def _clear_cache():
    """Clear Cicero cache before each test."""
    clear_cache()
    yield
    clear_cache()


def _make_mock_client():
    """Create a mock httpx.AsyncClient with a canned Cicero response."""
    from unittest.mock import MagicMock

    # Use MagicMock for resp so .json() returns a plain dict (not a coroutine)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = _mock_cicero_response()
    mock_resp.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.get.return_value = mock_resp
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    return mock_client


def test_locate_calls_cicero_and_parses():
    """Full locate() call with mocked HTTP response."""
    mock_client = _make_mock_client()

    with patch("app.gateway.cicero_service.httpx.AsyncClient", return_value=mock_client), \
         patch("app.gateway.cicero_service._get_api_key", return_value="test-key"):
        result = asyncio.run(locate(39.9526, -75.1635))

    assert result["cached"] is False
    assert len(result["officials"]) == 6
    assert result["districts"]["state"] == "PA"
    assert result["districts"]["congressional_dist"] == "3"
    assert result["districts"]["state_house_dist"] == "182"
    assert result["districts"]["state_senate_dist"] == "1"
    assert result["districts"]["council_district"] == "5"


def test_locate_caching():
    """Second call with same coords returns cached result."""
    mock_client = _make_mock_client()

    async def _run():
        result1 = await locate(39.9526, -75.1635)
        result2 = await locate(39.9526, -75.1635)
        return result1, result2

    with patch("app.gateway.cicero_service.httpx.AsyncClient", return_value=mock_client), \
         patch("app.gateway.cicero_service._get_api_key", return_value="test-key"):
        result1, result2 = asyncio.run(_run())

    assert result1["cached"] is False
    assert result2["cached"] is True
    assert mock_client.get.call_count == 1


def test_locate_nearby_coords_share_cache():
    """Coordinates within ~110m share cache key due to 3-decimal rounding."""
    mock_client = _make_mock_client()

    async def _run():
        await locate(39.95261, -75.16321)
        return await locate(39.95264, -75.16334)

    with patch("app.gateway.cicero_service.httpx.AsyncClient", return_value=mock_client), \
         patch("app.gateway.cicero_service._get_api_key", return_value="test-key"):
        result = asyncio.run(_run())

    assert result["cached"] is True
    assert mock_client.get.call_count == 1
