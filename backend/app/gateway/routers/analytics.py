"""District pulse analytics API router.

Provides endpoints for district-level grievance analytics, trends,
and emerging issues — data candidates can't get anywhere else.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.gateway.db import get_pool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/civic/analytics", tags=["analytics"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class CategoryCount(BaseModel):
    category: str
    count: int


class TimeBucket(BaseModel):
    period: str  # e.g. "2026-04", "2026-W15"
    count: int


class EmergingIssue(BaseModel):
    id: str
    issue_summary: str
    issue_category: str | None = None
    follow_count: int
    follow_velocity: int  # follows in last 7 days
    created_at: str


class DistrictPulseResponse(BaseModel):
    district_type: str
    district: str
    total_grievances: int = 0
    total_followers: int = 0
    resolution_rate: float = 0.0
    categories: list[CategoryCount] = Field(default_factory=list)
    monthly_trend: list[TimeBucket] = Field(default_factory=list)
    emerging_issues: list[EmergingIssue] = Field(default_factory=list)


class CategoryTrendItem(BaseModel):
    category: str
    count: int
    follow_total: int


class CategoryTrendsResponse(BaseModel):
    state: str
    categories: list[CategoryTrendItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/district-pulse",
    response_model=DistrictPulseResponse,
    summary="District Pulse Analytics",
    description="Grievance analytics for a specific district: category breakdown, monthly trend, emerging issues.",
)
async def district_pulse(
    district_type: str = Query(..., description="District column: council_district, state_house_dist, state_senate_dist, congressional_dist, city, state"),
    district: str = Query(..., description="District value"),
) -> DistrictPulseResponse:
    """Return district-level analytics."""
    allowed = {"council_district", "state_house_dist", "state_senate_dist", "congressional_dist", "city", "state"}
    if district_type not in allowed:
        raise HTTPException(status_code=400, detail=f"district_type must be one of: {', '.join(sorted(allowed))}")

    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    # Total counts
    totals = await pool.fetchrow(
        f"""
        SELECT count(*) AS total,
               COALESCE(SUM(follow_count), 0) AS followers,
               count(*) FILTER (WHERE status = 'resolved') AS resolved
        FROM grievance
        WHERE is_public = TRUE AND {district_type} = $1
        """,
        district,
    )
    total = totals["total"] if totals else 0
    followers = totals["followers"] if totals else 0
    resolved = totals["resolved"] if totals else 0
    resolution_rate = (resolved / total * 100) if total > 0 else 0.0

    # Category breakdown
    cat_rows = await pool.fetch(
        f"""
        SELECT issue_category, count(*) AS cnt
        FROM grievance
        WHERE is_public = TRUE AND {district_type} = $1 AND issue_category IS NOT NULL
        GROUP BY issue_category
        ORDER BY cnt DESC
        LIMIT 10
        """,
        district,
    )
    categories = [CategoryCount(category=r["issue_category"], count=r["cnt"]) for r in cat_rows]

    # Monthly trend (last 12 months)
    trend_rows = await pool.fetch(
        f"""
        SELECT to_char(created_at, 'YYYY-MM') AS period, count(*) AS cnt
        FROM grievance
        WHERE is_public = TRUE AND {district_type} = $1
          AND created_at >= now() - interval '12 months'
        GROUP BY period
        ORDER BY period
        """,
        district,
    )
    monthly_trend = [TimeBucket(period=r["period"], count=r["cnt"]) for r in trend_rows]

    # Emerging issues: highest follow velocity in last 7 days
    emerging_rows = await pool.fetch(
        f"""
        SELECT g.id, g.issue_summary, g.issue_category, g.follow_count, g.created_at,
               (SELECT count(*) FROM grievance_follow gf
                WHERE gf.grievance_id = g.id AND gf.created_at >= now() - interval '7 days') AS follow_velocity
        FROM grievance g
        WHERE g.is_public = TRUE AND g.{district_type} = $1
        ORDER BY follow_velocity DESC, g.follow_count DESC
        LIMIT 5
        """,
        district,
    )
    emerging = [
        EmergingIssue(
            id=str(r["id"]),
            issue_summary=r["issue_summary"],
            issue_category=r["issue_category"],
            follow_count=r["follow_count"],
            follow_velocity=r["follow_velocity"],
            created_at=r["created_at"].isoformat(),
        )
        for r in emerging_rows
    ]

    return DistrictPulseResponse(
        district_type=district_type,
        district=district,
        total_grievances=total,
        total_followers=followers,
        resolution_rate=round(resolution_rate, 1),
        categories=categories,
        monthly_trend=monthly_trend,
        emerging_issues=emerging,
    )


@router.get(
    "/category-trends",
    response_model=CategoryTrendsResponse,
    summary="Statewide Category Trends",
    description="Category breakdown across an entire state — useful for reporters and statewide officials.",
)
async def category_trends(
    state: str = Query(..., description="State abbreviation (e.g. PA)"),
) -> CategoryTrendsResponse:
    """Return statewide category trends."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    rows = await pool.fetch(
        """
        SELECT issue_category, count(*) AS cnt, COALESCE(SUM(follow_count), 0) AS follow_total
        FROM grievance
        WHERE is_public = TRUE AND state = $1 AND issue_category IS NOT NULL
        GROUP BY issue_category
        ORDER BY cnt DESC
        LIMIT 20
        """,
        state,
    )

    return CategoryTrendsResponse(
        state=state,
        categories=[
            CategoryTrendItem(category=r["issue_category"], count=r["cnt"], follow_total=r["follow_total"])
            for r in rows
        ],
    )
