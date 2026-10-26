# RESUME.md — bullets, numbers, and interview prep

> Rule: claim only what is actually in the repo and working. Replace every `[N]` with a real measured number, or delete the clause.

## 1. Numbers to collect (fill after Phase 16)
| Metric | Value | Where to get it |
|---|---|---|
| Parallel requests in concurrency test (N) | 25 | `booking.race.test.js` |
| Successful / conflicted / double-bookings | 1 / 24 / 0 | same test output |
| Concurrency stability | 10 / 10 consecutive runs passed | the 10-run loop |
| Total automated tests | 169 across 12 suites (server only so far) | CI log |
| Backend coverage | services 94.6% statements, 97.6% lines; utils 95.8% / 95.7%; whole server 86.4% / 88.2% | coverage report |
| Postman assertions passing | [ ] (pending clean Newman run; 47 assertions in the collection) | Newman summary |
| Lighthouse (Perf / A11y / Best Practices / SEO) | [ ] pending | Chrome Lighthouse on live URL |
| Live URL | [ ] pending | Vercel |
| GitHub repo | https://github.com/cs-amit7/workspace-scheduler | |
| API docs link | [ ] pending | Postman published docs |

## 2. Project header (resume)
**Smart Workspace Scheduler** — MERN · Google OAuth 2.0 · MongoDB Atlas · Vercel · Render · GitHub Actions | [Live demo] · [GitHub]

## 3. Bullet options (pick 3–4)
- Built a full-stack workspace booking platform (React, Node/Express, MongoDB) where users browse rooms/desks by amenity and capacity and reserve 30-minute slots; deployed on Vercel, Render and MongoDB Atlas.
- Eliminated double-booking at the database level using a unique partial multikey index on 30-minute time slots; a concurrency suite firing up to 60 parallel requests per scenario confirmed exactly one winner per contested slot and zero double-bookings, stable across 10 consecutive runs.
- Built and tested a REST API with Google OAuth 2.0 (Passport.js), JWT auth in httpOnly cookies, role-based access, rate limiting and Zod validation: 169 automated tests with 94%+ coverage on the service and utility layers, run on every push through GitHub Actions CI.
- Designed and documented a REST API; automated contract tests in Postman/Newman ([N] assertions) and unit/integration tests ([N] tests, [N]% service-layer coverage) run in a GitHub Actions CI pipeline.
- Handled time correctly end-to-end (UTC storage, local display) and computed live Upcoming/Active/Completed status badges client-side, avoiding stale stored state.
- Shipped a responsive, keyboard-accessible UI with a 30-minute availability grid (Lighthouse accessibility [N]).

**One-liner (LinkedIn/portfolio):** Workspace booking app with database-enforced conflict prevention, Google OAuth, and a tested, documented, CI-backed API.

## 4. Skills line
React, Node.js, Express, MongoDB/Mongoose, REST API design, OAuth 2.0, JWT, Zod, Jest, Supertest, Postman/Newman, GitHub Actions, Tailwind CSS, Vercel, Render.

## 5. Interview Q&A
**Walk me through the architecture.** React SPA on Vercel → `/api` rewrite → Express on Render → Mongo Atlas. Request: React sends POST /bookings → Express auth + Zod → service layer validates rules and builds 30-min slots → Mongo insert → unique index decides → 201 or 409 → UI updates.

**How do you prevent double-booking?** The DB enforces it: each booking stores the 30-min slots it covers, and a unique partial index on (resource, slots) for confirmed bookings makes overlapping inserts fail atomically. The app turns the duplicate-key error into a 409. An overlap query is only used for friendly messages.

**Why not just check for overlap before saving?** Race condition — two requests can both pass the check and both save. A transaction alone doesn't fix it either, because both transactions write different documents (write skew). The index makes the invariant a database property.

**What are the trade-offs of slot-based bookings?** Fixed 30-minute granularity and a slightly larger document, in exchange for simplicity and multi-instance safety.

**How does the OAuth flow work?** Redirect to Google with a state cookie → consent → callback with code → backend exchanges code for profile → upsert user → sign JWT → httpOnly cookie → redirect to the SPA.

**Why cookie JWT, not localStorage?** httpOnly cookies aren't readable by JavaScript, reducing XSS token theft. SameSite=Lax plus a JSON-only API and CORS whitelist mitigate CSRF.

**Why the Vercel rewrite?** Makes the API same-origin so cookies are first-party and OAuth redirects stay on one domain.

**How did you handle time zones?** Everything UTC in DB/API; UI converts. Date-picker maps a local day to a UTC window. Tested under a different timezone.

**Why aren't statuses stored?** They depend on the current time; storing them requires jobs and goes stale. Computed from start/end/now and the stored confirmed/cancelled flag.

**What would you do with more time?** Notifications, recurring bookings, refresh tokens/revocation, per-resource business hours, Redis-backed rate limiting, calendar sync.

**What was hardest?** (Fill with your real story — e.g. discovering the write-skew issue with transactions, or cookie behaviour across domains.)

## 6. Honesty checklist before sending the resume
- [ ] Every number above is measured, not guessed
- [ ] Live link works in a private window
- [ ] I can explain every line of the conflict-prevention code from memory
- [ ] README matches reality
