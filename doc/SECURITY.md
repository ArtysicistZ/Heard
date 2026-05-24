# Security Policy

## Supported Versions

Heard is under active development. Security fixes are applied to the `main` branch; we do not maintain separate LTS branches.

| Branch | Supported |
|--------|-----------|
| `main` | ✅ |
| older tags | ❌ |

## Reporting a Vulnerability

**Please do not open public GitHub issues for security vulnerabilities.**

If you discover a vulnerability, report it privately via one of:

1. **GitHub Security Advisories** — open a draft advisory on the repository's *Security* tab (preferred).
2. **Email** — send a description to the maintainer listed in the repository's GitHub profile, with the subject line `SECURITY: Heard`.

Include, to the extent possible:

- A description of the issue and its impact.
- Steps to reproduce (or a proof-of-concept).
- Affected components (frontend, gateway, agent runtime, database).
- Any suggested remediation.

We aim to acknowledge reports within **72 hours** and to provide a fix or mitigation timeline within **14 days**.

## Scope

In scope:

- The Heard application code in this repository (`backend/app/`, `frontend/src/`, `skills/public/`).
- Default deployment configurations (`Dockerfile.render`, `render.yaml`, `vercel.json`, `docker/`).
- Authentication, session management, and authorization logic.
- Data handling for grievances, user profiles, sent actions, and political-district lookups.

Out of scope:

- Upstream frameworks (LangGraph, LangChain, DeerFlow harness, better-auth, Next.js) — report those to their respective maintainers.
- Third-party services Heard integrates with (Anthropic, ElevenLabs, Cicero, Supabase, SendGrid).
- Self-hosted deployments that have disabled recommended production safeguards (`CORS_ALLOWED_ORIGINS`, auth secrets, HTTPS).
- Social-engineering or physical attacks on contributors or infrastructure operators.

## Hardening Checklist (Operators)

If you are deploying Heard, please verify:

- [ ] `.env`, `.env.development`, `.env.production` are **not** committed to source control.
- [ ] `AUTH_SECRET` and `BETTER_AUTH_SECRET` are generated fresh (`openssl rand -hex 32`) and identical between the gateway and the frontend.
- [ ] `DATABASE_URL` passwords use URL-encoded special characters (`#` → `%23`, `!` → `%21`, `,` → `%2C`).
- [ ] `CORS_ALLOWED_ORIGINS` restricts the gateway to your frontend origin(s) only.
- [ ] `BETTER_AUTH_TRUSTED_ORIGINS` is set (Vercel URL aliases are picked up automatically).
- [ ] TLS is terminated in front of every public-facing service.
- [ ] Database backups are enabled and tested.
- [ ] Production API keys (Anthropic, Cicero, ElevenLabs, SendGrid) are stored in a secret manager — never in the repo or CI logs.
- [ ] The agent sandbox is only reachable from the gateway, never exposed directly to the public internet.

## Known Tradeoffs

- **Location privacy**: grievance display coordinates are drifted ±0.002° from the real address. The underlying address is stored for district matching — consider stricter retention policies if deploying for sensitive populations.
- **Email delivery**: in development mode, "Send Now" actions are recorded in the database but may only log to the console. Before inviting real users, configure `SENDGRID_API_KEY` and verify a real send path end-to-end.
- **Agent sandbox**: the harness can execute code in a local sandbox. On shared infrastructure, run the harness behind a container boundary (Docker, Firecracker, gVisor) and disable network egress from the sandbox if not required.

## Thanks

Responsible disclosure keeps every Heard deployment safer. Thank you for taking the time to report issues through private channels.
