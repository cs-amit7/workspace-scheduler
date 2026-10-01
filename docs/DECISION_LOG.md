# Decision Log — Smart Workspace Scheduler

Format: **ID · Date · Status** → Context → Decision → Alternatives → Consequences.
Statuses: Proposed · Accepted · Superseded. Add a new entry whenever the code deviates from the docs.

---
### ADR-001 · 2026-10-01 · Accepted — MERN stack
**Context:** Portfolio project; MERN is the target stack for interviews.
**Decision:** MongoDB + Express + React (Vite) + Node.
**Alternatives:** Next.js full-stack; Postgres + Prisma.
**Consequences:** Mongo's multikey unique index gives a neat concurrency solution (ADR-004); relational joins are manual (few needed).

### ADR-002 · 2026-10-01 · Accepted — Vite instead of Create React App
**Decision:** Vite + React + Tailwind. **Why:** CRA is deprecated; Vite is fast and standard. **Consequence:** Env vars use `VITE_` prefix.

### ADR-003 · 2026-10-01 · Accepted — Single `Resource` model with `type`
**Context:** Rooms and desks share almost all fields.
**Decision:** One collection, `type: 'room' | 'desk'`.
**Alternatives:** Separate models. **Consequences:** One set of endpoints/UI; type-specific fields would need optional fields later.

### ADR-004 · 2026-10-01 · Accepted — DB-level unique partial index on 30-min slots for conflict prevention
**Context:** Check-then-save is racy. A transaction doing "find overlap, then insert" can still let two concurrent transactions both commit (write skew), because they write different documents.
**Decision:** Store `slots[]` (30-min starts) on each booking and put a **unique partial index** on `{resource, slots}` for `status:'confirmed'`. The database rejects any overlap atomically; the app maps error 11000 to `409 SLOT_TAKEN`.
**Alternatives:** (a) overlap query only — racy; (b) transaction + overlap query — write-skew risk unless a shared document is touched; (c) per-resource lock document — extra write on every booking; (d) in-memory mutex — breaks with multiple instances.
**Consequences:** Bulletproof and multi-instance safe; booking granularity fixed at 30 min; cancel must clear `slots`; index must exist in every environment (seed/tests call `syncIndexes`).

### ADR-005 · 2026-10-01 · Accepted — UTC everywhere, local time in the UI only
**Decision:** Store/transmit ISO UTC; convert in `utils/time.js`. **Why:** avoids timezone bugs and wrong status badges. **Consequence:** Date-picker must convert local day → UTC window.

### ADR-006 · 2026-10-01 · Accepted — Status badges are computed, not stored
**Decision:** Upcoming/Active/Completed derived from `now`, `start`, `end` on the client; only `confirmed|cancelled` is stored. **Why:** stored time-based status goes stale and needs a cron job.

### ADR-007 · 2026-10-01 · Accepted — Google OAuth only, JWT in httpOnly cookie (no server sessions)
**Decision:** `passport-google-oauth20` with `session:false`; JWT (7 days) in an httpOnly, Secure, SameSite=Lax cookie.
**Alternatives:** GitHub OAuth too; server sessions in Mongo; JWT in localStorage (XSS-exposed).
**Consequences:** Stateless API; no refresh-token flow in v1 (re-login after 7 days); no instant token revocation.

### ADR-008 · 2026-10-01 · Accepted — Bearer header accepted alongside the cookie
**Context:** Postman/Newman can't complete Google's browser flow.
**Decision:** Auth middleware reads cookie first, then `Authorization: Bearer`; `POST /auth/demo` returns the token in the body.
**Consequences:** Easy API testing. Token in response body is acceptable only because demo users have no privilege.

### ADR-009 · 2026-10-01 · Accepted — Demo login for recruiters; demo admin only behind a flag
**Context:** Google consent screen in testing mode restricts who can log in.
**Decision:** `POST /auth/demo` (role user). `role:'admin'` only if `ENABLE_DEMO_ADMIN=true` (local/CI), never in prod.

### ADR-010 · 2026-10-01 · Accepted — Same-origin API via Vercel rewrites
**Context:** Vercel (frontend) and Render (API) are different sites; cross-site cookies are blocked by many browsers.
**Decision:** Frontend calls `/api/*`; `vercel.json` rewrites to Render. OAuth callback lives on the Vercel domain.
**Consequences:** First-party cookies, no CORS in prod; extra proxy hop; need `trust proxy` on Express.

### ADR-011 · 2026-10-01 · Accepted — Zod for validation
**Decision:** Zod schemas for body/query/params and for env config. **Why:** one library, typed errors mapped to the envelope.

### ADR-012 · 2026-10-01 · Accepted — Jest + Supertest + mongodb-memory-server (server), Vitest + RTL (client)
**Why:** fast, no external DB in CI; Vitest matches Vite. **Consequence:** memory-server must support the unique partial index (it does — real mongod).

### ADR-013 · 2026-10-01 · Accepted — Free-tier hosting: Vercel + Render + Atlas M0
**Consequences:** Render cold starts (~1 min after 15 min idle) handled with UI notice and optional pinger; Atlas IP allowlist is `0.0.0.0/0` with a strong password and least-privilege user.

### ADR-014 · 2026-10-01 · Accepted — Cancel = soft cancel
**Decision:** `DELETE /bookings/:id` sets `status:'cancelled'` and empties `slots`; the record stays for history. Resources are likewise soft-disabled.

### ADR-015 · 2026-10-01 · Accepted — Prompts live inside TASKS.md
**Why:** one fewer file; prompts stay next to the tasks they implement.

---
## Open questions / revisit later
- Add GitHub OAuth? (only if there's a clear reason)
- Business-hours rule per resource?
- Refresh tokens / revocation list?
- Dark mode?

## Template
```
### ADR-0NN · YYYY-MM-DD · Proposed — Title
Context: ...
Decision: ...
Alternatives: ...
Consequences: ...
```
