"""PostgreSQL connection pool for the Heard platform.

Provides an asyncpg pool that is initialised once during the FastAPI lifespan
and shared across all request handlers.

Usage in routers::

    from app.gateway.db import get_pool

    @router.get("/example")
    async def example():
        pool = get_pool()
        row = await pool.fetchrow("SELECT 1 AS ok")
        return {"ok": row["ok"]}
"""

from __future__ import annotations

import logging
import os
import ssl as _ssl
from pathlib import Path

import asyncpg

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


def _get_database_url() -> str | None:
    """Resolve DATABASE_URL from environment or .env files.

    Resolution order:
      1. DATABASE_URL environment variable
      2. DATABASE_URL in root .env.development / .env.production / .env
      3. None (caller must handle)
    """
    url = os.environ.get("DATABASE_URL")
    if url:
        return url

    # Try reading from .env files in project root
    project_root = Path(__file__).resolve().parents[3]
    for env_name in (".env.development", ".env.production", ".env"):
        env_file = project_root / env_name
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                line = line.strip()
                if line.startswith("DATABASE_URL=") and not line.startswith("#"):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")

    return None


async def init_pool() -> asyncpg.Pool:
    """Create the connection pool.  Call once during app startup."""
    global _pool
    if _pool is not None:
        return _pool

    dsn = _get_database_url()
    if dsn is None:
        raise RuntimeError(
            "DATABASE_URL is not set. "
            "Copy .env.development.example to .env.development and configure your Supabase connection string."
        )

    logger.info("Connecting to PostgreSQL: %s", dsn.split("@")[-1])  # hide creds

    # Supabase requires SSL connections
    ssl_ctx = None
    if "supabase" in dsn:
        ssl_ctx = _ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = _ssl.CERT_NONE

    _pool = await asyncpg.create_pool(dsn=dsn, min_size=2, max_size=10, ssl=ssl_ctx, timeout=10)
    logger.info("PostgreSQL connection pool ready")
    return _pool


async def close_pool() -> None:
    """Gracefully close the pool.  Call during app shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL connection pool closed")


def get_pool() -> asyncpg.Pool:
    """Return the active pool.  Raises if not initialised."""
    if _pool is None:
        raise RuntimeError("Database pool not initialised — call init_pool() first")
    return _pool


async def run_migration(migration_path: str | Path) -> None:
    """Execute a SQL migration file against the database."""
    pool = get_pool()
    sql = Path(migration_path).read_text()
    async with pool.acquire() as conn:
        await conn.execute(sql)
    logger.info("Migration applied: %s", Path(migration_path).name)
