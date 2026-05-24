"""Candidate dashboard API router.

Provides endpoints for verified candidates to view constituent grievances
and action cards directed at them, matched by their political district level.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.gateway.db import get_pool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/civic/dashboard", tags=["dashboard"])


# ---------------------------------------------------------------------------
# District matching: candidate level → grievance column
# ---------------------------------------------------------------------------

# Maps candidate level to (grievance_column, profile_column) for matching.
# "municipal_at_large" and "statewide"/"us_senate" match broadly (city or state).
LEVEL_TO_MATCH: dict[str, tuple[str, str]] = {
    "municipal": ("council_district", "council_district"),
    "municipal_at_large": ("city", "city"),          # at-large sees ALL city grievances
    "county": ("county", "county"),
    "state_house": ("state_house_dist", "state_house_dist"),
    "state_senate": ("state_senate_dist", "state_senate_dist"),
    "statewide": ("state", "state"),                 # governor, AG, etc.
    "us_house": ("congressional_dist", "congressional_dist"),
    "us_senate": ("state", "state"),                 # senators see whole state
}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class DashboardGrievance(BaseModel):
    id: str
    issue_summary: str
    issue_category: str | None = None
    severity: str | None = None
    city: str | None = None
    state: str | None = None
    status: str = "open"
    follow_count: int = 0
    created_at: str
    sent_action_count: int = 0


class DirectedAction(BaseModel):
    id: str
    grievance_id: str | None = None
    sender_name: str | None = None
    issue_summary: str | None = None
    email_subject: str | None = None
    recipient_name: str | None = None
    status: str = "recorded"
    sent_at: str


class RespondRequest(BaseModel):
    user_id: str = Field(..., description="Candidate user ID")
    grievance_id: str = Field(..., description="Grievance to respond to")
    body: str = Field(..., min_length=1, max_length=5000, description="Response body")


class RespondResponse(BaseModel):
    id: str
    grievance_id: str
    status: str


class DashboardStats(BaseModel):
    total_grievances: int = 0
    total_directed_actions: int = 0
    total_followers: int = 0
    top_categories: list[dict] = Field(default_factory=list)


class DashboardResponse(BaseModel):
    candidate_name: str | None = None
    institution_name: str | None = None
    level: str | None = None
    district: str | None = None
    verified: bool = False
    stats: DashboardStats
    district_grievances: list[DashboardGrievance]
    directed_actions: list[DirectedAction]
    trending_grievances: list[DashboardGrievance]


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=DashboardResponse,
    summary="Get Candidate Dashboard",
    description="Returns district-matched grievances, directed actions, and stats for a verified candidate.",
)
async def get_dashboard(
    user_id: str = Query(..., description="Candidate user ID"),
) -> DashboardResponse:
    """Return dashboard data for a verified candidate."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    # Get candidate profile
    profile = await pool.fetchrow(
        """
        SELECT up.*, u.name AS user_name, i.name AS inst_name, i.district AS inst_district
        FROM user_profile up
        LEFT JOIN "user" u ON u.id = up.user_id
        LEFT JOIN institution i ON i.id = up.institution_id
        WHERE up.user_id = $1
        """,
        user_id,
    )

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if profile["user_type"] != "candidate":
        raise HTTPException(status_code=403, detail="Dashboard is for candidates only")
    if not profile["verified"]:
        return DashboardResponse(
            candidate_name=profile["user_name"],
            institution_name=profile["inst_name"],
            level=profile["level"],
            verified=False,
            stats=DashboardStats(),
            district_grievances=[],
            directed_actions=[],
            trending_grievances=[],
        )

    level = profile["level"] or "municipal"
    match_config = LEVEL_TO_MATCH.get(level)

    # --- District grievances ---
    district_grievances: list[DashboardGrievance] = []
    total_grievances = 0
    total_followers = 0

    if match_config:
        grievance_col, profile_col = match_config
        match_value = profile.get(profile_col) or profile.get("inst_district")

        if match_value:
            rows = await pool.fetch(
                f"""
                SELECT g.*,
                       (SELECT count(*) FROM sent_action sa WHERE sa.grievance_id = g.id) AS sent_action_count
                FROM grievance g
                WHERE g.is_public = TRUE AND g.{grievance_col} = $1
                ORDER BY g.created_at DESC
                LIMIT 50
                """,
                match_value,
            )
            district_grievances = [
                DashboardGrievance(
                    id=str(r["id"]),
                    issue_summary=r["issue_summary"],
                    issue_category=r["issue_category"],
                    severity=r["severity"],
                    city=r["city"],
                    state=r["state"],
                    status=r["status"],
                    follow_count=r["follow_count"],
                    created_at=r["created_at"].isoformat(),
                    sent_action_count=r["sent_action_count"],
                )
                for r in rows
            ]

            count_row = await pool.fetchrow(
                f"SELECT count(*) AS cnt FROM grievance WHERE is_public = TRUE AND {grievance_col} = $1",
                match_value,
            )
            total_grievances = count_row["cnt"] if count_row else 0

            follower_row = await pool.fetchrow(
                f"""
                SELECT COALESCE(SUM(g.follow_count), 0) AS total
                FROM grievance g
                WHERE g.is_public = TRUE AND g.{grievance_col} = $1
                """,
                match_value,
            )
            total_followers = follower_row["total"] if follower_row else 0

    # --- Directed actions (sent to this candidate's institution) ---
    directed_actions: list[DirectedAction] = []
    total_directed = 0

    # Match by institution_id OR by officeholder name (fallback when inst_id not set)
    officeholder_name = ""
    if profile["institution_id"]:
        inst_row = await pool.fetchrow("SELECT officeholder FROM institution WHERE id = $1", profile["institution_id"])
        if inst_row and inst_row["officeholder"]:
            officeholder_name = inst_row["officeholder"]

    if profile["institution_id"] or officeholder_name:
        action_rows = await pool.fetch(
            """
            SELECT sa.*, u.name AS sender_name, g.issue_summary
            FROM sent_action sa
            LEFT JOIN "user" u ON u.id = sa.sender_id
            LEFT JOIN grievance g ON g.id = sa.grievance_id
            WHERE sa.recipient_inst_id = $1
               OR ($2 != '' AND sa.recipient_name ILIKE '%' || $2 || '%')
            ORDER BY sa.sent_at DESC
            LIMIT 50
            """,
            profile["institution_id"],
            officeholder_name,
        )
        directed_actions = [
            DirectedAction(
                id=str(r["id"]),
                grievance_id=str(r["grievance_id"]) if r["grievance_id"] else None,
                sender_name=r["sender_name"],
                issue_summary=r["issue_summary"],
                email_subject=r["email_subject"],
                recipient_name=r["recipient_name"],
                status=r["status"],
                sent_at=r["sent_at"].isoformat(),
            )
            for r in action_rows
        ]
        count_row = await pool.fetchrow(
            """
            SELECT count(*) AS cnt FROM sent_action
            WHERE recipient_inst_id = $1
               OR ($2 != '' AND recipient_name ILIKE '%' || $2 || '%')
            """,
            profile["institution_id"],
            officeholder_name,
        )
        total_directed = count_row["cnt"] if count_row else 0

    # --- Top categories ---
    top_cats: list[dict] = []
    if match_config:
        grievance_col, _ = match_config
        match_value = profile.get(match_config[1]) or profile.get("inst_district")
        if match_value:
            cat_rows = await pool.fetch(
                f"""
                SELECT issue_category, count(*) AS cnt
                FROM grievance
                WHERE is_public = TRUE AND {grievance_col} = $1 AND issue_category IS NOT NULL
                GROUP BY issue_category
                ORDER BY cnt DESC
                LIMIT 5
                """,
                match_value,
            )
            top_cats = [{"category": r["issue_category"], "count": r["cnt"]} for r in cat_rows]

    # --- Trending (top by follow_count, same district) ---
    trending: list[DashboardGrievance] = []
    if match_config:
        grievance_col, _ = match_config
        match_value = profile.get(match_config[1]) or profile.get("inst_district")
        if match_value:
            trend_rows = await pool.fetch(
                f"""
                SELECT g.*,
                       (SELECT count(*) FROM sent_action sa WHERE sa.grievance_id = g.id) AS sent_action_count
                FROM grievance g
                WHERE g.is_public = TRUE AND g.{grievance_col} = $1
                ORDER BY g.follow_count DESC, g.created_at DESC
                LIMIT 10
                """,
                match_value,
            )
            trending = [
                DashboardGrievance(
                    id=str(r["id"]),
                    issue_summary=r["issue_summary"],
                    issue_category=r["issue_category"],
                    severity=r["severity"],
                    city=r["city"],
                    state=r["state"],
                    status=r["status"],
                    follow_count=r["follow_count"],
                    created_at=r["created_at"].isoformat(),
                    sent_action_count=r["sent_action_count"],
                )
                for r in trend_rows
            ]

    # Resolve district display value: for city-wide officials use city, for statewide use state
    district_display = profile.get("inst_district") or None
    if not district_display:
        if level in ("municipal_at_large",):
            district_display = profile.get("city")
        elif level in ("statewide", "us_senate"):
            district_display = profile.get("state")

    return DashboardResponse(
        candidate_name=profile["user_name"],
        institution_name=profile["inst_name"],
        level=level,
        district=district_display,
        verified=True,
        stats=DashboardStats(
            total_grievances=total_grievances,
            total_directed_actions=total_directed,
            total_followers=total_followers,
            top_categories=top_cats,
        ),
        district_grievances=district_grievances,
        directed_actions=directed_actions,
        trending_grievances=trending,
    )


@router.post(
    "/respond",
    response_model=RespondResponse,
    summary="Respond to a Grievance",
    description="Allows a verified candidate to post a public response to a grievance in their district.",
)
async def respond_to_grievance(req: RespondRequest) -> RespondResponse:
    """Post a public response to a grievance."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    # Verify candidate is verified
    profile = await pool.fetchrow(
        """
        SELECT up.*, i.name AS inst_name
        FROM user_profile up
        LEFT JOIN institution i ON i.id = up.institution_id
        WHERE up.user_id = $1
        """,
        req.user_id,
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if profile["user_type"] != "candidate" or not profile["verified"]:
        raise HTTPException(status_code=403, detail="Only verified candidates can respond")

    # Verify grievance exists and is public
    grievance = await pool.fetchrow(
        "SELECT id, user_id, issue_summary FROM grievance WHERE id = $1::uuid AND is_public = TRUE",
        req.grievance_id,
    )
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")

    # Insert response
    row = await pool.fetchrow(
        """
        INSERT INTO candidate_response (grievance_id, candidate_user_id, body)
        VALUES ($1::uuid, $2, $3)
        RETURNING id, status
        """,
        req.grievance_id,
        req.user_id,
        req.body,
    )

    # Create notification for grievance owner
    candidate_name = profile.get("user_name") or "An official"
    inst_name = profile.get("inst_name") or ""
    try:
        await pool.execute(
            """
            INSERT INTO notification (user_id, type, title, body, grievance_id)
            VALUES ($1, 'candidate_response', $2, $3, $4::uuid)
            """,
            grievance["user_id"],
            f"{candidate_name} responded to your grievance",
            f"{candidate_name}{(' from ' + inst_name) if inst_name else ''} posted a response to: {grievance['issue_summary'][:100]}",
            req.grievance_id,
        )
    except Exception:
        logger.warning("Failed to create notification for candidate response", exc_info=True)

    # Notify followers too
    try:
        follower_rows = await pool.fetch(
            "SELECT user_id FROM grievance_follow WHERE grievance_id = $1::uuid AND user_id != $2",
            req.grievance_id,
            grievance["user_id"],
        )
        for fr in follower_rows:
            await pool.execute(
                """
                INSERT INTO notification (user_id, type, title, body, grievance_id)
                VALUES ($1, 'candidate_response', $2, $3, $4::uuid)
                """,
                fr["user_id"],
                f"{candidate_name} responded to a grievance you follow",
                f"{candidate_name}{(' from ' + inst_name) if inst_name else ''} posted a response to: {grievance['issue_summary'][:100]}",
                req.grievance_id,
            )
    except Exception:
        logger.warning("Failed to notify followers of candidate response", exc_info=True)

    return RespondResponse(
        id=str(row["id"]),
        grievance_id=req.grievance_id,
        status=row["status"],
    )
