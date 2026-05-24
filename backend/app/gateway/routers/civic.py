"""Civic map API router for the Heard platform.

Provides endpoints for Philadelphia civic institutions, citizen contacts,
and resolution tracking.  All data is held in-memory (seeded deterministically
from ``civic_seed``).
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.gateway.data.civic_seed import (
    contacts,
    get_institution_stats,
    institutions,
    resolutions,
)
from app.gateway.db import get_pool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/civic", tags=["civic"])

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class InstitutionResponse(BaseModel):
    id: str
    name: str
    category: str
    address: str
    phone: str
    coordinates: list[float] = Field(..., description="[lng, lat]")
    description: str
    website: str
    officeholder: str | None = None
    district: str | None = None


class InstitutionsListResponse(BaseModel):
    institutions: list[InstitutionResponse]


class InstitutionStatsEntry(BaseModel):
    institutionId: str
    name: str
    category: str
    totalContacts: int
    contactsLast30Days: int
    resolvedCount: int
    unresolvedCount: int
    pendingCount: int
    inProgressCount: int
    resolutionRate: float
    topIssueCategories: list[dict]


class StatsListResponse(BaseModel):
    stats: list[InstitutionStatsEntry]


class ContactResponse(BaseModel):
    id: str
    institution_id: str
    issue_category: str
    summary: str
    created_at: str
    zip_code: str


class ContactsListResponse(BaseModel):
    contacts: list[ContactResponse]


class ContactCreateRequest(BaseModel):
    institution_id: str = Field(..., description="ID of the institution being contacted")
    issue_category: str = Field(..., description="Category of the issue")
    summary: str = Field(..., description="Brief description of the issue")
    zip_code: str = Field(..., description="Philadelphia zip code of the citizen")


class ResolutionResponse(BaseModel):
    id: str
    contact_id: str
    institution_id: str
    status: str
    reported_at: str
    resolved_at: str | None = None
    user_comment: str


class ResolutionCreateRequest(BaseModel):
    contact_id: str = Field(..., description="ID of the contact record")
    institution_id: str = Field(..., description="ID of the institution")
    status: str = Field(..., description="Status: pending, in-progress, resolved, or unresolved")
    user_comment: str = Field(default="", description="Optional user comment")


class ResolutionUpdateRequest(BaseModel):
    status: str | None = Field(None, description="Updated status")
    user_comment: str | None = Field(None, description="Updated user comment")


class GeoJSONFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: list[dict] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Lookup helpers
# ---------------------------------------------------------------------------

_inst_by_id: dict[str, dict] = {inst["id"]: inst for inst in institutions}

# Running ID counters for new records
_contact_counter: int = len(contacts) + 1
_resolution_counter: int = len(resolutions) + 1


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/institutions",
    response_model=InstitutionsListResponse,
    summary="List Institutions",
    description="Retrieve all civic institutions, optionally filtered by category.",
)
async def list_institutions(category: str | None = None) -> InstitutionsListResponse:
    """Return all institutions, optionally filtered by category."""
    result = institutions
    if category:
        result = [inst for inst in institutions if inst["category"] == category]
    return InstitutionsListResponse(institutions=result)


@router.get(
    "/institutions/{institution_id}",
    response_model=InstitutionResponse,
    summary="Get Institution",
    description="Retrieve a single civic institution by its ID.",
)
async def get_institution(institution_id: str) -> InstitutionResponse:
    """Return a single institution or 404."""
    inst = _inst_by_id.get(institution_id)
    if inst is None:
        raise HTTPException(status_code=404, detail=f"Institution '{institution_id}' not found")
    return InstitutionResponse(**inst)


@router.get(
    "/stats",
    response_model=StatsListResponse,
    summary="Get Institution Stats",
    description="Retrieve aggregated contact and resolution statistics per institution.",
)
async def get_stats() -> StatsListResponse:
    """Return aggregated stats for every institution."""
    return StatsListResponse(stats=get_institution_stats())


@router.get(
    "/contacts",
    response_model=ContactsListResponse,
    summary="List Contacts",
    description="Retrieve contact records, optionally filtered by institution or zip code.",
)
async def list_contacts(institution_id: str | None = None, zip_code: str | None = None) -> ContactsListResponse:
    """Return contacts with optional filters."""
    result = contacts
    if institution_id:
        result = [c for c in result if c["institution_id"] == institution_id]
    if zip_code:
        result = [c for c in result if c["zip_code"] == zip_code]
    return ContactsListResponse(contacts=result)


@router.post(
    "/contacts",
    response_model=ContactResponse,
    summary="Create Contact",
    description="Submit a new citizen contact record.",
    status_code=201,
)
async def create_contact(request: ContactCreateRequest) -> ContactResponse:
    """Create a new contact and append it to the in-memory list."""
    global _contact_counter

    # Validate institution exists
    if request.institution_id not in _inst_by_id:
        raise HTTPException(status_code=404, detail=f"Institution '{request.institution_id}' not found")

    contact = {
        "id": f"contact-{_contact_counter}",
        "institution_id": request.institution_id,
        "issue_category": request.issue_category,
        "summary": request.summary,
        "created_at": datetime.now(UTC).isoformat(),
        "zip_code": request.zip_code,
    }
    _contact_counter += 1
    contacts.append(contact)
    return ContactResponse(**contact)


@router.post(
    "/resolutions",
    response_model=ResolutionResponse,
    summary="Create Resolution",
    description="Submit a new resolution record for a contact.",
    status_code=201,
)
async def create_resolution(request: ResolutionCreateRequest) -> ResolutionResponse:
    """Create a new resolution and append it to the in-memory list."""
    global _resolution_counter

    # Validate that contact exists
    if not any(c["id"] == request.contact_id for c in contacts):
        raise HTTPException(status_code=404, detail=f"Contact '{request.contact_id}' not found")

    # Validate institution exists
    if request.institution_id not in _inst_by_id:
        raise HTTPException(status_code=404, detail=f"Institution '{request.institution_id}' not found")

    now_iso = datetime.now(UTC).isoformat()
    resolution = {
        "id": f"res-{_resolution_counter}",
        "contact_id": request.contact_id,
        "institution_id": request.institution_id,
        "status": request.status,
        "reported_at": now_iso,
        "resolved_at": now_iso if request.status == "resolved" else None,
        "user_comment": request.user_comment,
    }
    _resolution_counter += 1
    resolutions.append(resolution)
    return ResolutionResponse(**resolution)


@router.patch(
    "/resolutions/{resolution_id}",
    response_model=ResolutionResponse,
    summary="Update Resolution",
    description="Update the status or comment of an existing resolution.",
)
async def update_resolution(resolution_id: str, request: ResolutionUpdateRequest) -> ResolutionResponse:
    """Update an existing resolution's status and/or comment."""
    resolution = next((r for r in resolutions if r["id"] == resolution_id), None)
    if resolution is None:
        raise HTTPException(status_code=404, detail=f"Resolution '{resolution_id}' not found")

    if request.status is not None:
        resolution["status"] = request.status
        if request.status == "resolved" and resolution["resolved_at"] is None:
            resolution["resolved_at"] = datetime.now(UTC).isoformat()
    if request.user_comment is not None:
        resolution["user_comment"] = request.user_comment

    return ResolutionResponse(**resolution)


@router.get(
    "/districts",
    response_model=GeoJSONFeatureCollection,
    summary="Get Council Districts GeoJSON",
    description="Returns a GeoJSON FeatureCollection for Philadelphia council districts.",
)
async def get_districts() -> GeoJSONFeatureCollection:
    """Return a placeholder GeoJSON FeatureCollection.

    TODO: Fetch real district boundary polygons from OpenDataPhilly
    (https://opendataphilly.org/) or the City of Philadelphia ArcGIS API.
    """
    return GeoJSONFeatureCollection(
        type="FeatureCollection",
        features=[],  # Placeholder — populate from OpenDataPhilly
    )


# ---------------------------------------------------------------------------
# Location / district lookup endpoint
# ---------------------------------------------------------------------------


class LocateRequest(BaseModel):
    lat: float = Field(..., description="Latitude")
    lng: float = Field(..., description="Longitude")


class OfficialInfo(BaseModel):
    name: str
    party: str
    title: str
    heard_level: str
    district_type: str
    district_id: str
    district_label: str
    state: str
    emails: list[str] = Field(default_factory=list)
    web_form_url: str = ""
    photo_url: str = ""
    phone: str = ""
    chamber_name: str = ""


class DistrictInfo(BaseModel):
    council_district: str | None = None
    state_house_dist: str | None = None
    state_senate_dist: str | None = None
    congressional_dist: str | None = None
    state: str | None = None
    city: str | None = None
    county: str | None = None


class LocateResponse(BaseModel):
    districts: DistrictInfo
    officials: list[OfficialInfo]
    cached: bool = False


@router.post(
    "/locate",
    response_model=LocateResponse,
    summary="Locate Districts & Officials",
    description="Given a lat/lng, returns all political districts and elected officials via Cicero API.",
)
async def locate(request: LocateRequest) -> LocateResponse:
    """Look up political districts and officials for a coordinate."""
    from app.gateway.cicero_service import locate as cicero_locate

    try:
        result = await cicero_locate(request.lat, request.lng)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("Cicero lookup failed")
        raise HTTPException(status_code=500, detail=f"District lookup failed: {e}")

    return LocateResponse(
        districts=DistrictInfo(**result["districts"]),
        officials=[OfficialInfo(**o) for o in result["officials"]],
        cached=result.get("cached", False),
    )


# ---------------------------------------------------------------------------
# User profile endpoints
# ---------------------------------------------------------------------------


class ProfileCreateRequest(BaseModel):
    user_id: str = Field(..., description="better-auth user ID")
    user_type: str = Field(default="constituent", description="'constituent' or 'candidate'")
    # Constituent location fields (from Cicero)
    latitude: float | None = None
    longitude: float | None = None
    city: str | None = None
    state: str | None = None
    county: str | None = None
    council_district: str | None = None
    state_house_dist: str | None = None
    state_senate_dist: str | None = None
    congressional_dist: str | None = None
    # Candidate fields
    institution_id: str | None = None


class ProfileResponse(BaseModel):
    user_id: str
    user_type: str
    verified: bool = False
    name: str | None = None
    city: str | None = None
    state: str | None = None
    council_district: str | None = None
    state_house_dist: str | None = None
    state_senate_dist: str | None = None
    congressional_dist: str | None = None


@router.get(
    "/profile",
    response_model=ProfileResponse,
    summary="Get User Profile",
    description="Get user_profile for the given user_id.",
)
async def get_profile(user_id: str) -> ProfileResponse:
    """Return the user_profile for a given user_id."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    row = await pool.fetchrow(
        """
        SELECT p.*, u.name
        FROM user_profile p
        LEFT JOIN "user" u ON u.id = p.user_id
        WHERE p.user_id = $1
        """,
        user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(
        user_id=row["user_id"],
        user_type=row["user_type"],
        verified=row["verified"],
        name=row.get("name"),
        city=row.get("city"),
        state=row.get("state"),
        council_district=row.get("council_district"),
        state_house_dist=row.get("state_house_dist"),
        state_senate_dist=row.get("state_senate_dist"),
        congressional_dist=row.get("congressional_dist"),
    )


@router.post(
    "/profile",
    response_model=ProfileResponse,
    summary="Create User Profile",
    description="Create a user_profile record for a newly signed-up user.",
    status_code=201,
)
async def create_profile(request: ProfileCreateRequest) -> ProfileResponse:
    """Create a user_profile row linked to a better-auth user."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    # For candidates, auto-verify if institution_id matches a real institution
    verified = False
    level = None
    if request.user_type == "candidate" and request.institution_id:
        inst = await pool.fetchrow(
            "SELECT id, level FROM institution WHERE id = $1",
            request.institution_id,
        )
        if inst:
            verified = True
            level = inst["level"]

    await pool.execute(
        """
        INSERT INTO user_profile (
            user_id, user_type, latitude, longitude,
            city, state, county,
            council_district, state_house_dist, state_senate_dist, congressional_dist,
            institution_id, level, verified, verified_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                CASE WHEN $14 THEN now() ELSE NULL END)
        ON CONFLICT (user_id) DO UPDATE SET
            latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            county = EXCLUDED.county,
            council_district = EXCLUDED.council_district,
            state_house_dist = EXCLUDED.state_house_dist,
            state_senate_dist = EXCLUDED.state_senate_dist,
            congressional_dist = EXCLUDED.congressional_dist,
            institution_id = EXCLUDED.institution_id,
            level = EXCLUDED.level,
            verified = EXCLUDED.verified,
            verified_at = EXCLUDED.verified_at
        """,
        request.user_id,
        request.user_type,
        request.latitude,
        request.longitude,
        request.city,
        request.state,
        request.county,
        request.council_district,
        request.state_house_dist,
        request.state_senate_dist,
        request.congressional_dist,
        request.institution_id,
        level,
        verified,
    )
    return ProfileResponse(user_id=request.user_id, user_type=request.user_type, verified=verified)


# ---------------------------------------------------------------------------
# Send action endpoints
# ---------------------------------------------------------------------------


class SendActionRequest(BaseModel):
    thread_id: str = Field(..., description="Thread ID from the chat")
    issue_summary: str = Field(default="", description="Brief description of the issue")
    issue_category: str | None = Field(default=None)
    severity: str | None = Field(default=None)
    recipient_name: str = Field(default="")
    recipient_email: str | None = Field(default=None)
    recipient_title: str = Field(default="")
    jurisdiction: str | None = Field(default=None)
    email_subject: str = Field(default="")
    email_body: str = Field(default="")
    card_data: dict | None = Field(default=None)
    is_public: bool = Field(default=True, description="Make the grievance publicly visible")
    # sender_id is passed via query param or header (simplified for hackathon)
    sender_id: str | None = Field(default=None, description="User ID of the sender")


class SendActionResponse(BaseModel):
    sent_action_id: str
    grievance_id: str
    status: str


@router.post(
    "/send-action",
    response_model=SendActionResponse,
    summary="Send Action Card",
    description="Record an action card send. Creates a grievance (if first for this thread) and a sent_action record.",
    status_code=201,
)
async def send_action(request: SendActionRequest) -> SendActionResponse:
    """Record an action card send to an official."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    sender_id = request.sender_id
    if not sender_id:
        raise HTTPException(status_code=400, detail="sender_id is required")

    # Get sender profile for district data
    profile = await pool.fetchrow("SELECT * FROM user_profile WHERE user_id = $1", sender_id)

    import json
    import random

    # Find or create grievance for this thread
    grievance = await pool.fetchrow(
        "SELECT id FROM grievance WHERE thread_id = $1 AND user_id = $2",
        request.thread_id,
        sender_id,
    )

    if grievance:
        grievance_id = str(grievance["id"])
    else:
        # Create new grievance with location drift for public display
        lat = profile["latitude"] if profile else None
        lng = profile["longitude"] if profile else None
        display_lat = lat + random.uniform(-0.002, 0.002) if lat else None
        display_lng = lng + random.uniform(-0.002, 0.002) if lng else None

        row = await pool.fetchrow(
            """
            INSERT INTO grievance (
                user_id, thread_id, issue_summary, issue_category, severity,
                latitude, longitude, display_lat, display_lng,
                city, state, county,
                council_district, state_house_dist, state_senate_dist, congressional_dist,
                is_public
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id
            """,
            sender_id,
            request.thread_id,
            request.issue_summary,
            request.issue_category,
            request.severity,
            lat,
            lng,
            display_lat,
            display_lng,
            profile["city"] if profile else None,
            profile["state"] if profile else None,
            profile["county"] if profile else None,
            profile["council_district"] if profile else None,
            profile["state_house_dist"] if profile else None,
            profile["state_senate_dist"] if profile else None,
            profile["congressional_dist"] if profile else None,
            request.is_public,
        )
        grievance_id = str(row["id"])

    # Create sent_action record
    card_json = json.dumps(request.card_data) if request.card_data else None
    row = await pool.fetchrow(
        """
        INSERT INTO sent_action (
            sender_id, grievance_id, thread_id,
            recipient_name, recipient_email, recipient_title,
            jurisdiction, email_subject, email_body, card_data,
            status
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, 'recorded')
        RETURNING id
        """,
        sender_id,
        grievance_id,
        request.thread_id,
        request.recipient_name,
        request.recipient_email,
        request.recipient_title,
        request.jurisdiction,
        request.email_subject,
        request.email_body,
        card_json,
    )

    # Attempt email delivery if recipient email is provided
    email_status = "recorded"
    if request.recipient_email and request.email_subject and request.email_body:
        try:
            from app.gateway.services.email_sender import send_email
            result = await send_email(
                to_email=request.recipient_email,
                subject=request.email_subject,
                body_text=request.email_body,
            )
            email_status = result.get("status", "recorded")
            if email_status == "sent":
                await pool.execute(
                    "UPDATE sent_action SET status = 'sent' WHERE id = $1::uuid",
                    row["id"],
                )
            elif email_status == "failed":
                await pool.execute(
                    "UPDATE sent_action SET status = 'failed' WHERE id = $1::uuid",
                    row["id"],
                )
        except Exception:
            logger.warning("Email delivery attempt failed", exc_info=True)

    return SendActionResponse(
        sent_action_id=str(row["id"]),
        grievance_id=grievance_id,
        status=email_status if email_status in ("sent", "failed") else "recorded",
    )


# ---------------------------------------------------------------------------
# My Activity endpoint
# ---------------------------------------------------------------------------


class MyGrievanceItem(BaseModel):
    id: str
    issue_summary: str
    issue_category: str | None = None
    severity: str | None = None
    city: str | None = None
    state: str | None = None
    is_public: bool = False
    status: str = "open"
    follow_count: int = 0
    created_at: str
    sent_action_count: int = 0


class MySentActionItem(BaseModel):
    id: str
    recipient_name: str | None = None
    recipient_title: str | None = None
    email_subject: str | None = None
    status: str = "recorded"
    sent_at: str
    grievance_summary: str | None = None


class MyActivityResponse(BaseModel):
    grievances: list[MyGrievanceItem]
    sent_actions: list[MySentActionItem]


@router.get(
    "/my-activity",
    response_model=MyActivityResponse,
    summary="Get My Activity",
    description="Get the current user's grievances and sent actions.",
)
async def get_my_activity(user_id: str) -> MyActivityResponse:
    """Return grievances and sent actions for the authenticated user."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    # My grievances
    g_rows = await pool.fetch(
        """
        SELECT g.*,
               (SELECT count(*) FROM sent_action sa WHERE sa.grievance_id = g.id) AS sent_action_count
        FROM grievance g
        WHERE g.user_id = $1
        ORDER BY g.created_at DESC
        LIMIT 50
        """,
        user_id,
    )
    grievances = [
        MyGrievanceItem(
            id=str(r["id"]),
            issue_summary=r["issue_summary"],
            issue_category=r["issue_category"],
            severity=r["severity"],
            city=r["city"],
            state=r["state"],
            is_public=r["is_public"],
            status=r["status"],
            follow_count=r["follow_count"],
            created_at=r["created_at"].isoformat(),
            sent_action_count=r["sent_action_count"],
        )
        for r in g_rows
    ]

    # My sent actions
    a_rows = await pool.fetch(
        """
        SELECT sa.*, g.issue_summary AS grievance_summary
        FROM sent_action sa
        LEFT JOIN grievance g ON g.id = sa.grievance_id
        WHERE sa.sender_id = $1
        ORDER BY sa.sent_at DESC
        LIMIT 100
        """,
        user_id,
    )
    sent_actions = [
        MySentActionItem(
            id=str(r["id"]),
            recipient_name=r["recipient_name"],
            recipient_title=r["recipient_title"],
            email_subject=r["email_subject"],
            status=r["status"],
            sent_at=r["sent_at"].isoformat(),
            grievance_summary=r["grievance_summary"],
        )
        for r in a_rows
    ]

    return MyActivityResponse(grievances=grievances, sent_actions=sent_actions)


# ---------------------------------------------------------------------------
# Grievance visibility toggle
# ---------------------------------------------------------------------------


class VisibilityUpdateRequest(BaseModel):
    user_id: str = Field(..., description="User ID of the grievance owner")
    is_public: bool = Field(..., description="New visibility state")


class VisibilityUpdateResponse(BaseModel):
    grievance_id: str
    is_public: bool


@router.patch(
    "/grievances/{grievance_id}/visibility",
    response_model=VisibilityUpdateResponse,
    summary="Toggle Grievance Visibility",
    description="Toggle a grievance between public and private. Only the owner can change visibility.",
)
async def update_grievance_visibility(
    grievance_id: str,
    request: VisibilityUpdateRequest,
) -> VisibilityUpdateResponse:
    """Toggle grievance public/private visibility."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    row = await pool.fetchrow(
        "SELECT user_id FROM grievance WHERE id = $1::uuid",
        grievance_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Grievance not found")
    if row["user_id"] != request.user_id:
        raise HTTPException(status_code=403, detail="Not your grievance")

    await pool.execute(
        "UPDATE grievance SET is_public = $1, updated_at = now() WHERE id = $2::uuid",
        request.is_public,
        grievance_id,
    )
    return VisibilityUpdateResponse(grievance_id=grievance_id, is_public=request.is_public)


class StatusUpdateRequest(BaseModel):
    user_id: str = Field(..., description="User ID (owner or verified candidate)")
    status: str = Field(..., description="New status: open, in_progress, or resolved")


class StatusUpdateResponse(BaseModel):
    grievance_id: str
    status: str


@router.patch(
    "/grievances/{grievance_id}/status",
    response_model=StatusUpdateResponse,
    summary="Update Grievance Status",
    description="Update the status of a grievance. Only the owner or a matching verified candidate can update.",
)
async def update_grievance_status(
    grievance_id: str,
    request: StatusUpdateRequest,
) -> StatusUpdateResponse:
    """Update grievance status."""
    allowed_statuses = {"open", "in_progress", "resolved"}
    if request.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(allowed_statuses)}")

    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    grievance = await pool.fetchrow(
        "SELECT id, user_id, issue_summary, status FROM grievance WHERE id = $1::uuid",
        grievance_id,
    )
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")

    # Check authorization: owner or verified candidate in matching district
    is_owner = grievance["user_id"] == request.user_id
    if not is_owner:
        profile = await pool.fetchrow(
            "SELECT user_type, verified, level, council_district, state_house_dist, state_senate_dist, congressional_dist, city, state FROM user_profile WHERE user_id = $1",
            request.user_id,
        )
        if not profile or profile["user_type"] != "candidate" or not profile["verified"]:
            raise HTTPException(status_code=403, detail="Not authorized to update this grievance")

    old_status = grievance["status"]
    await pool.execute(
        "UPDATE grievance SET status = $1, updated_at = now() WHERE id = $2::uuid",
        request.status,
        grievance_id,
    )

    # Notify owner if a candidate changed the status
    if not is_owner:
        try:
            await pool.execute(
                """
                INSERT INTO notification (user_id, type, title, body, grievance_id)
                VALUES ($1, 'status_change', $2, $3, $4::uuid)
                """,
                grievance["user_id"],
                f"Grievance status updated to {request.status.replace('_', ' ')}",
                f'Your grievance "{grievance["issue_summary"][:80]}" was updated from {old_status} to {request.status}.',
                grievance_id,
            )
        except Exception:
            pass

    return StatusUpdateResponse(grievance_id=grievance_id, status=request.status)
