"""Tests for PostgreSQL database setup — pool, migration, and seed data.

These are integration tests that require a live PostgreSQL database.
They are skipped in CI when the database is unreachable.
"""

from __future__ import annotations

import asyncio
import os
import socket

import pytest


def _db_is_reachable() -> bool:
    """Check if DATABASE_URL is set and the host is network-reachable."""
    url = os.environ.get("DATABASE_URL", "")
    if not url.startswith("postgresql"):
        return False
    try:
        # Extract host from URL: ...@host:port/...
        host_part = url.split("@")[-1].split("/")[0]
        host, _, port = host_part.rpartition(":")
        if not host:
            host, port = host_part, "5432"
        sock = socket.create_connection((host, int(port)), timeout=3)
        sock.close()
        return True
    except (OSError, ValueError):
        return False


pytestmark = pytest.mark.skipif(
    not _db_is_reachable(),
    reason="DATABASE_URL not set or database not reachable",
)


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="module")
def pool(event_loop):
    from app.gateway.db import close_pool, init_pool

    p = event_loop.run_until_complete(init_pool())
    yield p
    event_loop.run_until_complete(close_pool())


def test_pool_connects(pool, event_loop):
    """Pool can execute a simple query."""
    row = event_loop.run_until_complete(pool.fetchrow("SELECT 1 AS ok"))
    assert row["ok"] == 1


def test_tables_exist(pool, event_loop):
    """All expected tables are present."""
    rows = event_loop.run_until_complete(pool.fetch("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"))
    table_names = {r["tablename"] for r in rows}
    expected = {"institution", "user_profile", "grievance", "grievance_follow", "sent_action"}
    assert expected.issubset(table_names), f"Missing tables: {expected - table_names}"


def test_institution_seed_count(pool, event_loop):
    """Institution table seeded with 95 rows."""
    row = event_loop.run_until_complete(pool.fetchrow("SELECT count(*) AS cnt FROM institution"))
    assert row["cnt"] == 95


def test_institution_levels(pool, event_loop):
    """Institution levels cover all expected government tiers."""
    rows = event_loop.run_until_complete(pool.fetch("SELECT DISTINCT level FROM institution ORDER BY level"))
    levels = {r["level"] for r in rows}
    assert "municipal" in levels
    assert "state_house" in levels
    assert "state_senate" in levels
    assert "us_house" in levels
    assert "us_senate" in levels


def test_institution_has_state(pool, event_loop):
    """All institutions have state = 'PA'."""
    row = event_loop.run_until_complete(pool.fetchrow("SELECT count(*) AS cnt FROM institution WHERE state != 'PA' OR state IS NULL"))
    assert row["cnt"] == 0


def test_grievance_table_accessible(pool, event_loop):
    """Grievance table is queryable."""
    row = event_loop.run_until_complete(pool.fetchrow("SELECT count(*) AS cnt FROM grievance"))
    assert row["cnt"] >= 0
