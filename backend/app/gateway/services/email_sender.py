"""Email delivery service using SendGrid.

Falls back to logging when SendGrid is not configured.
Usage: await send_email(to, subject, body)
"""

from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
SENDGRID_FROM_EMAIL = os.getenv("SENDGRID_FROM_EMAIL", "noreply@heard.civic")
SENDGRID_FROM_NAME = os.getenv("SENDGRID_FROM_NAME", "Heard Civic Platform")


async def send_email(
    to_email: str,
    subject: str,
    body_text: str,
    body_html: str | None = None,
) -> dict:
    """Send an email via SendGrid API.

    Returns a dict with 'status' ('sent', 'logged', 'failed') and optional 'error'.
    If SENDGRID_API_KEY is not set, logs the email and returns status='logged'.
    """
    if not SENDGRID_API_KEY:
        logger.info(
            "Email (no SendGrid configured): to=%s subject=%s body=%s",
            to_email,
            subject,
            body_text[:200],
        )
        return {"status": "logged", "message": "SendGrid not configured — email logged only"}

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": SENDGRID_FROM_EMAIL, "name": SENDGRID_FROM_NAME},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body_text}],
    }
    if body_html:
        payload["content"].append({"type": "text/html", "value": body_html})

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.sendgrid.com/v3/mail/send",
                json=payload,
                headers={
                    "Authorization": f"Bearer {SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
                timeout=15.0,
            )
        if resp.status_code in (200, 201, 202):
            logger.info("Email sent to %s: %s", to_email, subject)
            return {"status": "sent"}
        else:
            logger.warning("SendGrid error %s: %s", resp.status_code, resp.text[:300])
            return {"status": "failed", "error": f"SendGrid returned {resp.status_code}"}
    except Exception as e:
        logger.warning("Email send failed: %s", e)
        return {"status": "failed", "error": str(e)}
