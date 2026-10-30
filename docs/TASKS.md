# Tasks & Antigravity Prompts — Smart Workspace Scheduler

Work **one phase at a time**, one prompt at a time. After each phase: run the tests, review the diff (ask Claude to review it — see §3), tick the boxes, log any deviation in `DECISION_LOG.md`, then commit.

## 1. How to prompt Antigravity
1. Keep `AGENT_RULES.md` in the repo root and the `docs/` folder committed *before* the first prompt. (Check Antigravity's current docs for where project rules/workflow files are picked up automatically; if it doesn't auto-load them, say "Read AGENT_RULES.md and docs/X.md first" in every prompt.)
2. **Prompt template**
```
CONTEXT: Read AGENT_RULES.md and docs/<relevant>.md. Current phase: <N>.
TASK: <one concrete deliverable>.
CONSTRAINTS: <stack/rules; what NOT to touch; no new dependencies unless listed>.
DONE WHEN: <commands that must pass / behaviours to verify>.
Before coding, show a short plan. After coding, list files changed and how to verify.
```
3. Prefer plan-first for multi-file work; review the plan, then let it implement.
4. Never ask for "the whole app". If a prompt touches more than ~8 files, split it.
5. If the agent deviates from the docs, either fix the code or update the docs + Decision Log — never leave them out of sync.

## 2. Phases

### Phase 0 — Repo & tooling
- [x] Monorepo folders `client/`, `server/`, `docs/`, `postman/`; git init; `.gitignore`; `.editorconfig`
- [x] ESLint + Prettier on both packages; `npm run lint` works
- [x] Root README stub; copy docs in

**Prompt:** `CONTEXT: AGENT_RULES.md, docs/ARCHITECTURE.md §6. TASK: scaffold client (Vite+React+Tailwind+React Router) and server (Express, ESM) with the folder structure in the doc, ESLint+Prettier, and npm scripts dev/lint/test. CONSTRAINTS: no business logic yet. DONE WHEN: both apps start; /api/health returns {data:{status:'ok'}}; lint passes.`

### Phase 1 — Backend foundation
- [x] `config/env.js` validates env with Zod (fail fast)
- [x] `config/db.js` (maxPoolSize 10)
- [x] `app.js` with helmet, CORS whitelist, JSON limit, cookie-parser, global rate limit
- [x] Central `ApiError` + error middleware matching API.md envelope
- [x] `validate(zod)` middleware

**Prompt:** `CONTEXT: docs/ARCHITECTURE.md §6-§10, docs/API.md conventions. TASK: implement items above. CONSTRAINTS: app.js must export the app without listening. DONE WHEN: unit test proves unknown route returns 404 in the error envelope.`

### Phase 2 — Models, indexes, seed
- [x] User, Resource, Booking schemas exactly as in ARCHITECTURE §3
- [x] Unique partial index `{resource, slots}` where `status:'confirmed'`; other indexes
- [x] `seed.js` (≈12 rooms, ≈20 desks, varied amenities) — idempotent
- [x] `autoIndex` verified (call `Model.syncIndexes()` in seed/tests)

**Prompt:** `TASK: create the three Mongoose models and indexes from docs/ARCHITECTURE.md §3, plus an idempotent seed script. DONE WHEN: npm run seed twice leaves the same counts; a test shows inserting two confirmed bookings with an overlapping slot throws code 11000.`

### Phase 3 — Auth (Google OAuth + JWT + demo)
- [x] Passport Google strategy, `session:false`, signed state cookie
- [x] Callback upserts user, applies `ADMIN_EMAILS`, sets httpOnly cookie, redirects
- [x] `auth` middleware (cookie → Bearer fallback), `requireRole`
- [x] `/auth/me`, `/auth/logout`, `/auth/demo` (admin only when `ENABLE_DEMO_ADMIN`)
- [x] Google Cloud OAuth client created (see DEPLOYMENT §3)

**Prompt:** `CONTEXT: docs/ARCHITECTURE.md §5, docs/API.md Auth. TASK: implement auth. CONSTRAINTS: never put the token in the URL or localStorage; cookie flags httpOnly, SameSite=Lax, Secure in production. DONE WHEN: Supertest covers demo login, /me with cookie and with Bearer, 401 without token, 403 for demo admin when flag off.`

### Phase 4 — Resources API
- [x] List with filters/pagination/search; get one; availability endpoint
- [x] Admin create/update/soft-delete
- [x] `availableFrom/To` filter uses overlap query

**Prompt:** `CONTEXT: docs/API.md Resources. TASK: implement endpoints with Zod validation and service layer. DONE WHEN: integration tests cover filters, pagination meta, 403 for non-admin, availability window >7 days → 400.`

### Phase 5 — Bookings API + conflict logic ⭐
- [x] `utils/slots.js`: alignment check, `expandSlots(start,end)`
- [x] `bookingService.create` (rules → create → map 11000 → 409 with conflict window)
- [x] `GET /bookings/me`, admin list, `DELETE` (soft cancel, clears slots)
- [x] Rate limit on POST /bookings

**Prompt:** `CONTEXT: docs/ARCHITECTURE.md §4 and docs/PRD.md §7 are authoritative. TASK: implement booking logic. CONSTRAINTS: the unique index is the source of truth — do NOT rely on find-then-insert; do not use in-memory locks. DONE WHEN: unit tests for slots.js; integration tests for 201, 409, each 400 rule, owner-only cancel, rebooking a cancelled slot succeeds.`

### Phase 6 — Backend test hardening
- [x] mongodb-memory-server setup (replica set not required)
- [x] **Concurrency test:** 25 parallel POSTs for the same slot ⇒ exactly 1×201 and 24×409; DB has 1 confirmed booking
- [x] Coverage report ≥ 80% on `services/` and `utils/`

**Prompt:** `TASK: write tests/concurrency/booking.race.test.js per docs/TESTING.md §4. DONE WHEN: test passes 10 consecutive runs.`

### Phase 7 — Frontend foundation
- [x] Tailwind colour tokens + fonts from DESIGN.md §6 (dark theme), layout, `Navbar`, `ProtectedRoute`/`AdminRoute`
- [x] `AuthContext` (calls `/auth/me`), `api/` fetch wrapper (credentials, error normalisation, 401 handling)
- [x] Login page (Google + demo)
- [x] Vite dev proxy `/api → localhost:5000`

**Prompt:** `CONTEXT: docs/DESIGN.md §2-§3 and §6 (dark theme tokens are authoritative). TASK: build the foundation items, including tailwind.config.js colour tokens and Inter + JetBrains Mono fonts. CONSTRAINTS: no UI library beyond Tailwind; fetch only (no axios). DONE WHEN: demo login works end-to-end; refresh keeps the session; logout works.`

### Phase 8 — Dashboard & filters
- [x] `ResourceCard`, `AmenityBadge`, `FilterBar`, `Pagination`, skeleton/empty/error states
- [x] URL query-param synced filters (shareable links)

**Prompt:** `CONTEXT: docs/DESIGN.md §4 Dashboard, §7. TASK: build Dashboard against GET /resources. DONE WHEN: filters, pagination and states work at 360 px and 1280 px.`

### Phase 9 — Resource detail, slot grid, booking
- [x] `DatePicker`, `SlotGrid` (availability from API, keyboard nav), `BookingPanel`
- [x] Local⇄UTC helpers in `utils/time.js` (+ unit tests)
- [x] 409 handled inline and availability refetched

**Prompt:** `CONTEXT: docs/DESIGN.md §4 Resource detail, §8, §10. TASK: build booking flow. CONSTRAINTS: send UTC ISO only. DONE WHEN: booking succeeds; a second tab booking the same slot shows the conflict message.`

### Phase 10 — My Bookings & status badges
- [ ] Upcoming/Past tabs, `StatusBadge`, `useNow()`, `ConfirmDialog` cancel flow
- [ ] `utils/status.js` pure function + unit tests (boundary: now == start, now == end)

**Prompt:** `CONTEXT: docs/DESIGN.md §5. TASK: implement. DONE WHEN: vitest passes for status.js boundaries; cancelling updates the list without reload.`

### Phase 11 — Admin
- [ ] Resource table, create/edit modal (`ResourceForm`), enable/disable toggle, admin bookings view
- [ ] Non-admin redirected

**Prompt:** `CONTEXT: docs/API.md Resources(admin). TASK: build /admin. DONE WHEN: demo admin (local) can create, edit, disable; demo user gets redirected.`

### Phase 12 — Polish
- [ ] Toasts, focus management, aria on grid, 404 page, favicon/meta, Lighthouse pass
- [ ] Cold-start notice (>3 s)

### Phase 13 — Postman
- [ ] Import collection/environment from `postman/`; run in Collection Runner; all tests green
- [ ] Publish docs (Postman → collection → Publish) and add link to README

### Phase 14 — CI
- [x] `.github/workflows/ci.yml`: install, lint, test (server + client), upload coverage
- [x] Badge in README

**Prompt:** `TASK: create GitHub Actions workflow running lint and tests for server and client on push/PR to main, Node LTS, npm cache. DONE WHEN: workflow green on a test PR.`

### Phase 15 — Deploy
- [ ] Follow `DEPLOYMENT.md` end to end
- [ ] Smoke test checklist passes on the live URL

### Phase 16 — Docs, screenshots, resume
- [ ] README screenshots/GIF + live link
- [ ] Fill real numbers in `RESUME.md` (tests, coverage, concurrency result, Lighthouse)
- [ ] Final Decision Log review

## 3. Claude (free tier) as reviewer — prompt template
```
You are a strict senior reviewer. Spec: <paste relevant doc section>.
Here is the diff / file: <paste>.
1) List spec violations. 2) List bugs & race conditions. 3) List security issues.
4) Missing tests. 5) Anything over-engineered. Be specific, cite lines. No praise.
```
Use it at the end of Phases 3, 5, 9, and 15. Also ask it to "interview me on the booking conflict logic" before applying to jobs.

## 4. Definition of done (every phase)
Lint passes · tests pass · docs still accurate · no secrets committed · Decision Log updated if anything changed · committed with a clear message.
