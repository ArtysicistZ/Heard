"""Public grievance feed API router.

Provides endpoints for listing, searching, and following public grievances.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.gateway.db import get_pool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/civic/grievances", tags=["grievances"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class GrievanceListItem(BaseModel):
    id: str
    user_id: str
    issue_summary: str
    issue_category: str | None = None
    severity: str | None = None
    display_lat: float | None = None
    display_lng: float | None = None
    city: str | None = None
    state: str | None = None
    council_district: str | None = None
    state_house_dist: str | None = None
    state_senate_dist: str | None = None
    congressional_dist: str | None = None
    status: str = "open"
    follow_count: int = 0
    is_following: bool = False
    created_at: str
    sent_action_count: int = 0


class GrievanceListResponse(BaseModel):
    grievances: list[GrievanceListItem]
    total: int
    page: int
    page_size: int


class CandidateResponseItem(BaseModel):
    id: str
    candidate_name: str | None = None
    candidate_title: str | None = None
    institution_name: str | None = None
    body: str
    created_at: str


class GrievanceDetail(GrievanceListItem):
    thread_id: str | None = None
    county: str | None = None
    updated_at: str | None = None
    sent_actions: list[dict] = Field(default_factory=list)
    candidate_responses: list[CandidateResponseItem] = Field(default_factory=list)


class FollowResponse(BaseModel):
    grievance_id: str
    following: bool
    follow_count: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=GrievanceListResponse,
    summary="List Public Grievances",
    description="List public grievances with optional filters, search, and pagination.",
)
async def list_grievances(
    q: str | None = Query(None, description="Full-text search query"),
    state: str | None = Query(None, description="Filter by state"),
    district_type: str | None = Query(None, description="District type: council_district, state_house_dist, state_senate_dist, congressional_dist"),
    district: str | None = Query(None, description="District value (used with district_type)"),
    category: str | None = Query(None, description="Filter by issue_category"),
    sort: str = Query("recent", description="Sort by: recent or popular"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Results per page"),
    user_id: str | None = Query(None, description="Current user ID (for is_following)"),
) -> GrievanceListResponse:
    """Return public grievances with filters."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    # Build WHERE clause
    conditions = ["g.is_public = TRUE"]
    params: list = []
    param_idx = 0

    if q:
        param_idx += 1
        conditions.append(f"g.search_vector @@ plainto_tsquery('english', ${param_idx})")
        params.append(q)

    if state:
        param_idx += 1
        conditions.append(f"g.state = ${param_idx}")
        params.append(state)

    if district_type and district:
        allowed = {"council_district", "state_house_dist", "state_senate_dist", "congressional_dist"}
        if district_type in allowed:
            param_idx += 1
            conditions.append(f"g.{district_type} = ${param_idx}")
            params.append(district)

    if category:
        param_idx += 1
        conditions.append(f"g.issue_category = ${param_idx}")
        params.append(category)

    where = " AND ".join(conditions)
    order = "g.follow_count DESC, g.created_at DESC" if sort == "popular" else "g.created_at DESC"
    offset = (page - 1) * page_size

    # Count total
    count_row = await pool.fetchrow(f"SELECT count(*) AS cnt FROM grievance g WHERE {where}", *params)
    total = count_row["cnt"] if count_row else 0

    # Fetch page
    param_idx += 1
    limit_param = param_idx
    param_idx += 1
    offset_param = param_idx

    query = f"""
        SELECT g.*,
               (SELECT count(*) FROM sent_action sa WHERE sa.grievance_id = g.id) AS sent_action_count
        FROM grievance g
        WHERE {where}
        ORDER BY {order}
        LIMIT ${limit_param} OFFSET ${offset_param}
    """
    rows = await pool.fetch(query, *params, page_size, offset)

    # Check follow status if user_id provided
    following_set: set[str] = set()
    if user_id and rows:
        gids = [row["id"] for row in rows]
        follow_rows = await pool.fetch(
            "SELECT grievance_id FROM grievance_follow WHERE user_id = $1 AND grievance_id = ANY($2::uuid[])",
            user_id,
            gids,
        )
        following_set = {str(r["grievance_id"]) for r in follow_rows}

    grievances = [
        GrievanceListItem(
            id=str(row["id"]),
            user_id=row["user_id"],
            issue_summary=row["issue_summary"],
            issue_category=row["issue_category"],
            severity=row["severity"],
            display_lat=row["display_lat"],
            display_lng=row["display_lng"],
            city=row["city"],
            state=row["state"],
            council_district=row["council_district"],
            state_house_dist=row["state_house_dist"],
            state_senate_dist=row["state_senate_dist"],
            congressional_dist=row["congressional_dist"],
            status=row["status"],
            follow_count=row["follow_count"],
            is_following=str(row["id"]) in following_set,
            created_at=row["created_at"].isoformat(),
            sent_action_count=row["sent_action_count"],
        )
        for row in rows
    ]

    return GrievanceListResponse(
        grievances=grievances,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{grievance_id}",
    response_model=GrievanceDetail,
    summary="Get Grievance Detail",
)
async def get_grievance(
    grievance_id: str,
    user_id: str | None = Query(None),
) -> GrievanceDetail:
    """Return a single public grievance with its sent actions."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    row = await pool.fetchrow(
        "SELECT * FROM grievance WHERE id = $1::uuid AND is_public = TRUE",
        grievance_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Grievance not found")

    # Get sent actions
    action_rows = await pool.fetch(
        "SELECT recipient_name, recipient_title, jurisdiction, status, sent_at FROM sent_action WHERE grievance_id = $1::uuid ORDER BY sent_at",
        grievance_id,
    )
    sent_actions = [
        {
            "recipient_name": r["recipient_name"],
            "recipient_title": r["recipient_title"],
            "jurisdiction": r["jurisdiction"],
            "status": r["status"],
            "sent_at": r["sent_at"].isoformat(),
        }
        for r in action_rows
    ]

    # Get candidate responses
    candidate_responses: list[CandidateResponseItem] = []
    try:
        resp_rows = await pool.fetch(
            """
            SELECT cr.id, cr.body, cr.created_at, u.name AS candidate_name,
                   i.name AS institution_name, p.level AS candidate_title
            FROM candidate_response cr
            LEFT JOIN "user" u ON u.id = cr.candidate_user_id
            LEFT JOIN user_profile p ON p.user_id = cr.candidate_user_id
            LEFT JOIN institution i ON i.id = p.institution_id
            WHERE cr.grievance_id = $1::uuid AND cr.status = 'published'
            ORDER BY cr.created_at
            """,
            grievance_id,
        )
        candidate_responses = [
            CandidateResponseItem(
                id=str(r["id"]),
                candidate_name=r["candidate_name"],
                candidate_title=r["candidate_title"],
                institution_name=r["institution_name"],
                body=r["body"],
                created_at=r["created_at"].isoformat(),
            )
            for r in resp_rows
        ]
    except Exception:
        # Table may not exist yet if migration hasn't run
        pass

    # Check follow status
    is_following = False
    if user_id:
        follow = await pool.fetchrow(
            "SELECT 1 FROM grievance_follow WHERE grievance_id = $1::uuid AND user_id = $2",
            grievance_id,
            user_id,
        )
        is_following = follow is not None

    return GrievanceDetail(
        id=str(row["id"]),
        user_id=row["user_id"],
        thread_id=row["thread_id"],
        issue_summary=row["issue_summary"],
        issue_category=row["issue_category"],
        severity=row["severity"],
        display_lat=row["display_lat"],
        display_lng=row["display_lng"],
        city=row["city"],
        state=row["state"],
        county=row["county"],
        council_district=row["council_district"],
        state_house_dist=row["state_house_dist"],
        state_senate_dist=row["state_senate_dist"],
        congressional_dist=row["congressional_dist"],
        status=row["status"],
        follow_count=row["follow_count"],
        is_following=is_following,
        created_at=row["created_at"].isoformat(),
        updated_at=row["updated_at"].isoformat() if row["updated_at"] else None,
        sent_action_count=len(sent_actions),
        sent_actions=sent_actions,
        candidate_responses=candidate_responses,
    )


class SimilarGrievanceItem(BaseModel):
    id: str
    issue_summary: str
    issue_category: str | None = None
    severity: str | None = None
    city: str | None = None
    state: str | None = None
    follow_count: int = 0
    created_at: str
    relevance: float = 0.0


class SimilarGrievancesResponse(BaseModel):
    similar: list[SimilarGrievanceItem]


@router.get(
    "/{grievance_id}/similar",
    response_model=SimilarGrievancesResponse,
    summary="Find Similar Grievances",
    description="Find grievances similar to the given one by text similarity and category.",
)
async def get_similar_grievances(
    grievance_id: str,
    limit: int = Query(5, ge=1, le=20),
) -> SimilarGrievancesResponse:
    """Return similar public grievances using full-text ranking."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    # Get the source grievance
    source = await pool.fetchrow(
        "SELECT issue_summary, issue_category, city, state, council_district, congressional_dist FROM grievance WHERE id = $1::uuid AND is_public = TRUE",
        grievance_id,
    )
    if not source:
        raise HTTPException(status_code=404, detail="Grievance not found")

    # Build a query using the issue_summary for full-text ranking
    # Also boost same category and same district
    rows = await pool.fetch(
        """
        SELECT g.id, g.issue_summary, g.issue_category, g.severity, g.city, g.state,
               g.follow_count, g.created_at,
               ts_rank(g.search_vector, plainto_tsquery('english', $1)) AS rank
        FROM grievance g
        WHERE g.id != $2::uuid
          AND g.is_public = TRUE
          AND g.search_vector @@ plainto_tsquery('english', $1)
        ORDER BY
          CASE WHEN g.issue_category = $3 THEN 1 ELSE 0 END DESC,
          rank DESC,
          g.follow_count DESC
        LIMIT $4
        """,
        source["issue_summary"],
        grievance_id,
        source["issue_category"],
        limit,
    )

    similar = [
        SimilarGrievanceItem(
            id=str(r["id"]),
            issue_summary=r["issue_summary"],
            issue_category=r["issue_category"],
            severity=r["severity"],
            city=r["city"],
            state=r["state"],
            follow_count=r["follow_count"],
            created_at=r["created_at"].isoformat(),
            relevance=float(r["rank"]),
        )
        for r in rows
    ]

    return SimilarGrievancesResponse(similar=similar)


@router.post(
    "/{grievance_id}/follow",
    response_model=FollowResponse,
    summary="Toggle Follow",
    description="Follow or unfollow a grievance. Toggles on each call.",
)
async def toggle_follow(
    grievance_id: str,
    user_id: str = Query(..., description="User ID"),
) -> FollowResponse:
    """Toggle follow status for a grievance."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    # Check grievance exists and is public
    grievance = await pool.fetchrow(
        "SELECT id, user_id, follow_count, issue_summary FROM grievance WHERE id = $1::uuid AND is_public = TRUE",
        grievance_id,
    )
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")

    # Check if already following
    existing = await pool.fetchrow(
        "SELECT 1 FROM grievance_follow WHERE grievance_id = $1::uuid AND user_id = $2",
        grievance_id,
        user_id,
    )

    if existing:
        # Unfollow
        await pool.execute(
            "DELETE FROM grievance_follow WHERE grievance_id = $1::uuid AND user_id = $2",
            grievance_id,
            user_id,
        )
        await pool.execute(
            "UPDATE grievance SET follow_count = GREATEST(follow_count - 1, 0) WHERE id = $1::uuid",
            grievance_id,
        )
        following = False
    else:
        # Follow
        await pool.execute(
            "INSERT INTO grievance_follow (grievance_id, user_id) VALUES ($1::uuid, $2) ON CONFLICT DO NOTHING",
            grievance_id,
            user_id,
        )
        await pool.execute(
            "UPDATE grievance SET follow_count = follow_count + 1 WHERE id = $1::uuid",
            grievance_id,
        )
        following = True

        # Notify grievance owner of new follower
        if grievance["user_id"] != user_id:
            try:
                new_count_row = await pool.fetchrow("SELECT follow_count FROM grievance WHERE id = $1::uuid", grievance_id)
                count = new_count_row["follow_count"] if new_count_row else 1
                # Milestone notifications at 5, 10, 25, 50, 100
                milestones = {5, 10, 25, 50, 100}
                if count in milestones:
                    await pool.execute(
                        """
                        INSERT INTO notification (user_id, type, title, body, grievance_id)
                        VALUES ($1, 'milestone', $2, $3, $4::uuid)
                        """,
                        grievance["user_id"],
                        f"Your grievance reached {count} supporters!",
                        f'"{grievance["issue_summary"][:80]}" now has {count} supporters.',
                        grievance_id,
                    )
                else:
                    await pool.execute(
                        """
                        INSERT INTO notification (user_id, type, title, body, grievance_id)
                        VALUES ($1, 'new_follower', $2, $3, $4::uuid)
                        """,
                        grievance["user_id"],
                        "Someone supported your grievance",
                        f'A community member is now following: "{grievance["issue_summary"][:80]}"',
                        grievance_id,
                    )
            except Exception:
                logger.warning("Failed to create follow notification", exc_info=True)

    # Get updated count
    row = await pool.fetchrow("SELECT follow_count FROM grievance WHERE id = $1::uuid", grievance_id)
    new_count = row["follow_count"] if row else 0

    return FollowResponse(
        grievance_id=grievance_id,
        following=following,
        follow_count=new_count,
    )