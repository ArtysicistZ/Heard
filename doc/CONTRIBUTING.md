# Contributing to Heard

Thanks for your interest in contributing! Heard is the Claude × Penn AI Hackathon 2026 first-place project in the Democratic Governance track. We're building this in the open because civic tooling should be transparent, auditable, and community-owned.

This guide covers the local setup, workflow, and review expectations for pull requests.

---

## Code of Conduct

All contributors must follow the [Code of Conduct](./CODE_OF_CONDUCT.md). Be kind, assume good faith, and remember: many contributors and downstream users may be non-technical civic stakeholders.

---

## Getting Set Up

### 1. Fork and clone

```bash
git clone https://github.com/<your-fork>/Heard.git
cd Heard
git remote add upstream https://github.com/StevenWang-CY/Heard.git
```

### 2. Install prerequisites

| Tool | Version |
|------|---------|
| Python | 3.12+ |
| Node.js | 22+ |
| pnpm | 10.26+ |
| uv | latest |
| nginx | 1.20+ |
| PostgreSQL | 14+ (or Supabase) |

```bash
make check    # verifies all of the above
make install  # installs backend + frontend dependencies
```

### 3. Configure

Copy the example files — never edit them in place:

```bash
cp .env.example                   .env
cp .env.development.example       .env.development
cp config.example.yaml            config.yaml
cp extensions_config.example.json extensions_config.json
```

Fill in `ANTHROPIC_API_KEY`, `CICERO_API_KEY`, `ELEVENLABS_API_KEY`, a `DATABASE_URL`, and fresh `AUTH_SECRET` / `BETTER_AUTH_SECRET` values (`openssl rand -hex 32`).

Initialize auth tables on a fresh database:

```bash
cd frontend && npx @better-auth/cli migrate -y --config src/server/better-auth/config.ts
```

### 4. Run

```bash
make dev
# → http://localhost:2026
```

---

## Development Workflow

### Branching

- `main` is always deployable.
- Branch from `main` for each change: `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
- Keep branches focused: one logical change per PR.

### Commits

- Use [Conventional Commits](https://www.conventionalcommits.org/) prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Explain the **why** in the commit body when the change isn't obvious from the diff.
- Never commit secrets. Example: if you add a new env var, update `.env.example` with a safe placeholder and document it in the README.

### Running tests and lint

Before opening a PR:

```bash
# Backend
cd backend && make lint && make test

# Frontend
cd frontend && pnpm check      # eslint + tsc --noEmit
cd frontend && pnpm build      # make sure the production build passes
```

### Migrations

Database changes go in `backend/migrations/NNN_descriptive_name.sql`. Migrations must be:

- **Idempotent** — `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, etc.
- **Forward-only** — Heard does not ship `down.sql` files.
- **Safe under concurrent writes** — avoid locking operations on hot tables without `CONCURRENTLY`.

### Skills

Agent skills live under `skills/public/<skill-name>/`. A skill is a folder with:

- `SKILL.md` — metadata + short description (registered at startup).
- Optional `assets/`, `reference/`, `scripts/` (progressively loaded).

See existing skills in `skills/public/` for examples.

---

## Code Style

### Python (backend)

- Formatted and linted by **ruff**. Run `make lint` from `backend/`.
- Type hints required on public function signatures.
- Prefer `async` for I/O-bound code (the gateway is async from top to bottom).

### TypeScript (frontend)

- Formatted by **Prettier**, linted by **ESLint**. Run `pnpm check`.
- Server Components by default; add `"use client"` only when the component is actually interactive.
- Use the `cn()` helper from `@/lib/utils` for conditional Tailwind classes.
- Path alias: `@/*` → `src/*`.
- Don't edit generated directories: `components/ui/` (shadcn) and `components/ai-elements/` (Vercel AI SDK).

### Imports

- Enforced order: builtin → external → internal → parent → sibling, alphabetized, newlines between groups.
- Use inline type imports: `import { type Foo } from "...";`.

---

## Pull Request Checklist

Before requesting review:

- [ ] Branch rebased on latest `main`.
- [ ] `make lint` and tests pass locally.
- [ ] `pnpm check` passes locally.
- [ ] New env vars documented in `.env.example` and `README.md` / `CLAUDE.md`.
- [ ] New database columns shipped with a migration in `backend/migrations/`.
- [ ] Screenshots or a short clip attached for UI changes.
- [ ] No secrets, personal data, or real credentials in the diff or in committed fixtures.
- [ ] No unrelated reformatting / churn.

PR description should answer:

1. **What** does this change?
2. **Why** is the change needed?
3. **How** did you test it?
4. What **risks** or follow-ups does a reviewer need to know about?

---

## Reporting Issues

- **Bugs** — use the GitHub issue tracker with reproduction steps, expected vs. actual behavior, and environment info.
- **Feature requests** — open an issue with a short use-case and the user journey you want to see.
- **Security vulnerabilities** — **do not open a public issue.** Follow the process in [SECURITY.md](./SECURITY.md).

---

## Architecture Notes for Contributors

A quick map of where things live:

- `backend/app/gateway/routers/civic.py` — locate, profile, send-action.
- `backend/app/gateway/routers/grievances.py` — public feed, follow, detail.
- `backend/app/gateway/routers/dashboard.py` — candidate dashboard + pulse analytics.
- `backend/app/gateway/cicero_service.py` — Cicero client (district matching).
- `backend/app/gateway/db.py` — asyncpg pool.
- `backend/migrations/` — SQL schema.
- `backend/packages/harness/` — agent harness (DeerFlow-based orchestration).
- `frontend/src/core/threads/` — thread creation, streaming, state.
- `frontend/src/core/civic/` — civic API clients and hooks.
- `frontend/src/components/workspace/` — chat UI, action cards, messages.
- `frontend/src/components/workspace/civic-map/` — MapLibre map layers.
- `frontend/src/app/dashboard/` — candidate dashboard.

See [CLAUDE.md](./CLAUDE.md) for the full architectural overview.

---

## License

By contributing to Heard, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
