"""In-app notification API router.

Provides endpoints for fetching, reading, and managing user notifications.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.gateway.db import get_pool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/civic/notifications", tags=["notifications"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class NotificationItem(BaseModel):
    id: str
    type: str
    title: str
    body: str
    grievance_id: str | None = None
    is_read: bool = False
    created_at: str


class NotificationListResponse(BaseModel):
    notifications: list[NotificationItem]
    unread_count: int


class ReadResponse(BaseModel):
    success: bool = True


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=NotificationListResponse,
    summary="Get Notifications",
    description="Fetch notifications for a user, newest first.",
)
async def get_notifications(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(50, ge=1, le=100, description="Max notifications to return"),
) -> NotificationListResponse:
    """Return notifications for a user."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    rows = await pool.fetch(
        """
        SELECT id, type, title, body, grievance_id, is_read, created_at
        FROM notification
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        """,
        user_id,
        limit,
    )

    unread_row = await pool.fetchrow(
        "SELECT count(*) AS cnt FROM notification WHERE user_id = $1 AND is_read = FALSE",
        user_id,
    )
    unread_count = unread_row["cnt"] if unread_row else 0

    notifications = [
        NotificationItem(
            id=str(r["id"]),
            type=r["type"],
            title=r["title"],
            body=r["body"],
            grievance_id=str(r["grievance_id"]) if r["grievance_id"] else None,
            is_read=r["is_read"],
            created_at=r["created_at"].isoformat(),
        )
        for r in rows
    ]

    return NotificationListResponse(
        notifications=notifications,
        unread_count=unread_count,
    )


@router.post(
    "/read",
    response_model=ReadResponse,
    summary="Mark Notification Read",
)
async def mark_read(
    notification_id: str = Query(..., description="Notification ID"),
    user_id: str = Query(..., description="User ID"),
) -> ReadResponse:
    """Mark a single notification as read."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    await pool.execute(
        "UPDATE notification SET is_read = TRUE WHERE id = $1::uuid AND user_id = $2",
        notification_id,
        user_id,
    )
    return ReadResponse()


@router.post(
    "/read-all",
    response_model=ReadResponse,
    summary="Mark All Notifications Read",
)
async def mark_all_read(
    user_id: str = Query(..., description="User ID"),
) -> ReadResponse:
    """Mark all notifications as read for a user."""
    try:
        pool = get_pool()
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Database not available")

    await pool.execute(
        "UPDATE notification SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
        user_id,
    )
    return ReadResponse()
