# PRD — Smart Workspace Scheduler

**Version:** 1.0 · **Date:** 2026-10-01 · **Owner:** Amit · **Status:** Approved

## 1. Overview
A web app where users browse meeting rooms and study desks, check amenities, and book specific time slots. Double-booking is impossible by design (enforced at the database level). Admins manage the inventory.

## 2. Goals
1. Let a signed-in user find an available room/desk and book it in under 30 seconds.
2. Guarantee **zero double-bookings**, even under concurrent requests.
3. Be a deployable, documented, tested portfolio project (live URL, CI, API docs).

## 3. Non-goals (deliberately out of scope)
Email/SMS notifications, recurring bookings, payments, calendar sync (Google/Outlook), multi-tenant organisations, native mobile apps.

## 4. Users
| Persona | Needs |
|---|---|
| **Member** (student/employee) | See what's free, book, view and cancel own bookings |
| **Admin** | Add/edit/disable rooms and desks; see all bookings |
| **Recruiter (demo visitor)** | Try the app instantly without a Google account (demo login) |

## 5. User stories & acceptance criteria
| ID | Story | Acceptance criteria |
|---|---|---|
| US-1 | As a member, I sign in with Google | Click "Sign in with Google" → consent → land on dashboard, name/avatar shown; logout clears session |
| US-2 | As a visitor, I try the demo | "Try demo" logs me in as a demo user with no Google step |
| US-3 | As a member, I browse resources | Cards show name, type, capacity, location, amenity badges; paginated |
| US-4 | As a member, I filter resources | Filter by type, amenity(ies), min capacity, and "available between X and Y" |
| US-5 | As a member, I see a day's availability | Slot grid (30-min cells) for a chosen date; booked cells disabled |
| US-6 | As a member, I book a slot | Pick date + start + end → 201 and confirmation; overlapping request → 409 with clear message |
| US-7 | As a member, I see my bookings | Upcoming / Past tabs; each shows a status badge |
| US-8 | As a member, I cancel a booking | Only my own, only if not yet ended; slot becomes bookable again immediately |
| US-9 | As an admin, I manage resources | Create, edit, disable (soft) resources; non-admins get 403 |

## 6. Functional requirements
- **FR-1** Google OAuth 2.0 login; JWT issued in an httpOnly cookie (Bearer header also accepted for API clients).
- **FR-2** Demo login endpoint (user role always; admin role only when `ENABLE_DEMO_ADMIN=true`, never in production).
- **FR-3** Resource CRUD (admin) and read/list/filter (any signed-in user).
- **FR-4** Booking create/list-mine/cancel; admin can list all.
- **FR-5** Availability endpoint returning booked intervals for a time window.
- **FR-6** Booking status badges (Upcoming / Active / Completed / Cancelled) computed from the current time, never stored.

## 7. Business rules
1. Bookings snap to **30-minute** boundaries; `start < end`.
2. Minimum 30 minutes, **maximum 4 hours**.
3. Cannot book in the past; cannot book more than **30 days** ahead.
4. A resource can have only one confirmed booking per 30-minute slot.
5. Only the owner (or an admin) can cancel; cancelling frees the slots.
6. Disabled resources cannot be booked; existing bookings remain visible.
7. All timestamps stored and transmitted in **UTC (ISO 8601)**; the UI converts to local time.

## 8. Non-functional requirements
| Area | Requirement |
|---|---|
| Concurrency | N parallel requests for the same slot ⇒ exactly 1 success, rest 409 (automated test) |
| Security | Helmet, CORS whitelist, rate limiting on auth & booking routes, Zod validation on all inputs, httpOnly+Secure cookies, no secrets in repo |
| Performance | List/availability endpoints p95 < 300 ms on warm server (seeded data); indexed queries; pagination (default 12, max 50) |
| Reliability | Consistent error format; health endpoint; graceful handling of Render cold start (UI loading state) |
| Quality | Backend service-layer coverage target ≥ 80%; CI (lint + tests) green on every push |
| Accessibility | Keyboard-navigable forms/grid, visible focus, colour not the only status signal, WCAG AA contrast target |
| Compatibility | Latest Chrome/Edge/Firefox/Safari; responsive from 360 px |
| Documentation | README, API docs (Postman published), architecture + decision log |

## 9. Success metrics (collect real numbers for the resume)
- Concurrency test: `N` parallel requests → `1` success, `N-1` conflicts, `0` double-bookings.
- Test count and coverage % (from CI).
- Lighthouse score of the live site.
- Live demo URL reachable; CI badge green.

## 10. Risks
| Risk | Mitigation |
|---|---|
| Render free tier cold start (~1 min after 15 min idle) | Loading state in UI; optional free uptime pinger; note in README |
| Race condition double-booking | DB-level unique partial index on slots (ADR-004) |
| OAuth redirect/cookie issues across domains | Same-origin proxy via Vercel rewrites (ADR-010) |
| Scope creep | Non-goals list above; every addition needs a Decision Log entry |

## 11. Milestones
M1 Backend + auth → M2 Resources & bookings + tests → M3 Frontend → M4 Admin + polish → M5 Postman + CI → M6 Deploy + docs + resume numbers. (See `TASKS.md`.)
