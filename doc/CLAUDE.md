# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Heard?

> **Claude × Penn AI Hackathon 2026 — First Place Project (Democratic Governance track).**

Heard is a civic empowerment platform. A citizen speaks or types a personal grievance and provides a US address; Heard returns a complete advocacy toolkit: root-cause analysis, affected-population estimate, elected-official power map, drafted letters / testimony / petitions, and a political strategy brief — plus a public community map, grievance feed, and a dashboard for verified elected officials.

The agent runtime is built on an internal harness derived from [DeerFlow](https://github.com/bytedance/deer-flow), ByteDance's open-source super-agent framework — it orchestrates sub-agents, memory, a sandbox, and a skills registry. User-facing product, branding, schema, UI, gateway API, and all civic-specific agent logic are Heard's own.

## Commands

```bash
# Check system requirements
make check

# Install all dependencies (frontend + backend)
make install

# Start all services in development mode
make dev
# Access at http://localhost:2026

# Stop all services
make stop

# Backend only (from backend/)
cd backend && make dev       # LangGraph server (port 2024)
cd backend && make gateway   # Gateway API (port 8001)
cd backend && make test      # Run tests
cd backend && make lint      # Lint with ruff

# Frontend only (from frontend/)
cd frontend && pnpm dev      # Next.js dev server (port 3000)
cd frontend && pnpm check    # Lint + type check
```

## Architecture

**Agent harness** (Python/LangGraph backend + Next.js frontend):
- **LangGraph Server** (port 2024): Agent runtime and workflow execution
- **Gateway API** (port 8001): REST API for models, MCP, skills, memory, artifacts, civic platform
- **Frontend** (port 3000): Next.js web interface
- **Nginx** (port 2026): Unified reverse proxy entry point
- **PostgreSQL**: Persistent storage for users, profiles, grievances, sent actions, institutions

See `backend/CLAUDE.md` and `frontend/CLAUDE.md` for detailed architecture docs.

## Heard Platform Features

### Auth & Onboarding
- **Two user types**: Constituents and Candidates (elected officials)
- **better-auth** with PostgreSQL adapter, email+password signup
- Constituent signup: name/email/password → geolocation → Cicero API district matching
- Candidate signup: name/email/password → institution picker → auto-verification

### Cicero API Integration
- One-click geolocation → `POST /api/civic/locate` → Cicero API → all political districts
- Maps lat/lng to: council_district, state_house_dist, state_senate_dist, congressional_dist, city, state
- Handles at-large seats (municipal_at_large)
- 24h in-memory cache keyed by rounded lat/lng

### Inline Action Cards
- Agent generates `action-cards.json` → rendered inline in chat stream (not in right panel)
- "Send Now" button records to `sent_action` table (fake send, DB recording only)
- Grievance created with location drift (±0.002 deg) for privacy
- Progress bar tracks how many officials contacted

### Community Page (Map + Grievance Feed)
- Unified `/workspace/community` with Map/List toggle
- Map: institution markers + public grievance dots (colored by severity)
- List: searchable/filterable grievance feed with follow (heart) button
- Full-text search via PostgreSQL `tsvector`

### Candidate Dashboard
- `/dashboard` — only visible to candidate users
- Multi-level district matching (municipal→council_district, us_senate→state, etc.)
- Tabs: "In My District" | "Directed to Me" | "Trending"
- Stats: total grievances, directed actions, total follows, top categories

## Environment Variables

Copy `config.example.yaml` to `config.yaml`. Environment variables use a three-file system:

| File | Purpose | Loaded by |
|------|---------|-----------|
| `.env` | Shared API keys (non-environment-specific) | All modes |
| `.env.development` | Dev Supabase `DATABASE_URL` + `AUTH_SECRET` | `make dev` |
| `.env.production` | Prod Supabase `DATABASE_URL` + `AUTH_SECRET` | `make start` |

Setup:
```bash
cp .env.example .env                           # API keys
cp .env.development.example .env.development   # Dev database
cp config.example.yaml config.yaml             # App config
```

Required in `.env`:
```
ANTHROPIC_API_KEY=...         # LLM provider
CICERO_API_KEY=...            # District matching API
```

Required in `.env.development` / `.env.production`:
```
DATABASE_URL=postgresql://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:5432/postgres
AUTH_SECRET=...               # JWT shared secret
BETTER_AUTH_SECRET=...        # Must match AUTH_SECRET
```

CI/CD secrets are stored in GitHub Secrets (repo Settings > Secrets and variables > Actions).

After setting up a new Supabase database, run the better-auth migration to create auth tables:
```bash
cd frontend && npx @better-auth/cli migrate -y --config src/server/better-auth/config.ts
```

## Key Files

- `config.yaml` — Main application configuration (models, tools, sandbox, memory)
- `extensions_config.json` — MCP servers and skills configuration
- `backend/packages/harness/deerflow/` — Core agent harness framework
- `backend/app/gateway/` — FastAPI Gateway API
- `backend/app/gateway/routers/civic.py` — Civic platform API (locate, profile, send-action)
- `backend/app/gateway/routers/grievances.py` — Public grievance feed API
- `backend/app/gateway/routers/dashboard.py` — Candidate dashboard API
- `backend/app/gateway/cicero_service.py` — Cicero API client (district matching)
- `backend/app/gateway/db.py` — PostgreSQL connection pool (asyncpg)
- `backend/migrations/001_init.sql` — Database schema (institution, user_profile, grievance, sent_action, grievance_follow)
- `frontend/src/components/auth/` — Auth pages, provider, location picker, user button
- `frontend/src/components/workspace/messages/action-cards-inline.tsx` — Inline action cards
- `frontend/src/components/workspace/civic-map/grievance-markers.tsx` — Map grievance layer
- `frontend/src/app/dashboard/page.tsx` — Candidate dashboard
- `frontend/src/` — Next.js frontend application
- `skills/` — Agent skills directory
- `doc/` — Project documentation (`CICERO_API.md`, `US_POLITICAL_DISTRICTS.md`)

## Development Rules

- Always check the official API documentation before writing or testing any API call. Do not rely on memory or assumptions for endpoint URLs, request formats, authentication headers, or model IDs.
