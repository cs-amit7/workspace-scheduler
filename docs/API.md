# API Reference — Smart Workspace Scheduler

Base URL: `/api` (local: `http://localhost:5000/api`). JSON everywhere. All times are **UTC ISO 8601**.

## Conventions
- **Auth:** httpOnly cookie `token` (browser) or `Authorization: Bearer <jwt>` (API clients/Postman).
- **Success envelope:** `{ "data": ..., "meta": { "page", "limit", "total" } }` (`meta` only on lists).
- **Error envelope:** `{ "error": { "code": "SLOT_TAKEN", "message": "...", "details": [...] } }`
- **Pagination:** `?page=1&limit=12` (default 12, max 50).
- **Rate limits:** auth routes 20 / 15 min, `POST /bookings` 30 / 15 min, global 300 / 15 min (per IP). Exceeded → `429 RATE_LIMITED`.

## Status codes & error codes
| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad input, misaligned time, past/too long/too far ahead |
| 401 | `UNAUTHENTICATED` | Missing/invalid token |
| 403 | `FORBIDDEN` | Wrong role or not the owner |
| 404 | `NOT_FOUND` | Unknown id |
| 409 | `SLOT_TAKEN` | Requested window overlaps a confirmed booking |
| 409 | `INVALID_STATE` | e.g. cancelling an already-cancelled/ended booking; resource disabled |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL` | Unexpected |

---
## Health
### `GET /health` — public
`200 { "data": { "status": "ok", "uptime": 123.4 } }`

## Auth
### `GET /auth/google` — public
Redirects to Google consent screen.

### `GET /auth/google/callback` — public
Handles Google redirect, upserts the user, sets the `token` cookie, redirects to `CLIENT_URL`.

### `POST /auth/demo` — public
Body (optional): `{ "role": "user" | "admin" }`. `admin` works only if `ENABLE_DEMO_ADMIN=true`, otherwise `403`.
`200 { "data": { "user": {...}, "token": "<jwt>" } }` + sets cookie.

### `GET /auth/me` — auth
`200 { "data": { "_id", "name", "email", "avatar", "role" } }`

### `POST /auth/logout` — auth
Clears cookie. `204`.

## Resources
### `GET /resources` — auth
Query: `type=room|desk`, `amenity=WiFi&amenity=Projector` (all must match), `minCapacity=4`, `availableFrom=<ISO>&availableTo=<ISO>` (exclude resources with confirmed overlapping bookings), `q=<name search>`, `page`, `limit`. Only active resources unless admin passes `includeInactive=true`.
```json
{ "data": [ { "_id": "665f...", "name": "Orion Room", "type": "room", "capacity": 8,
  "location": "Floor 2", "amenities": ["WiFi","Projector"], "isActive": true } ],
  "meta": { "page": 1, "limit": 12, "total": 24 } }
```

### `GET /resources/:id` — auth
`200 { "data": { ...resource } }` · `404`

### `GET /resources/:id/availability?from=<ISO>&to=<ISO>` — auth
Window max 7 days. Returns booked intervals only (no user data for non-admins).
```json
{ "data": { "resourceId": "665f...", "from": "...", "to": "...",
  "booked": [ { "start": "2026-10-05T04:30:00.000Z", "end": "2026-10-05T06:00:00.000Z" } ] } }
```

### `POST /resources` — admin
```json
{ "name": "Orion Room", "type": "room", "capacity": 8, "location": "Floor 2",
  "amenities": ["WiFi","Projector"], "description": "Glass-walled meeting room" }
```
`201 { "data": {...} }` · `400` · `403`

### `PATCH /resources/:id` — admin
Partial update of the same fields plus `isActive`. `200` · `404`

### `DELETE /resources/:id` — admin
Soft-disable (`isActive=false`). `200 { "data": {...} }`

## Bookings
### `POST /bookings` — auth
```json
{ "resourceId": "665f...", "start": "2026-10-05T04:30:00.000Z", "end": "2026-10-05T06:00:00.000Z" }
```
Rules: 30-min aligned, 30 min ≤ duration ≤ 4 h, start in the future, ≤ 30 days ahead, resource active.
- `201 { "data": { "_id", "resource", "user", "start", "end", "status": "confirmed" } }`
- `409 SLOT_TAKEN` with `details: { "conflict": { "start", "end" } }`
- `400 VALIDATION_ERROR`

### `GET /bookings/me?when=upcoming|past|all&page&limit` — auth
Returns the caller's bookings with the resource populated (`name`, `type`). Upcoming = `end > now`; sorted ascending (upcoming) or descending (past).

### `GET /bookings` — admin
Query: `resourceId`, `userId`, `from`, `to`, `status`, `page`, `limit`.

### `DELETE /bookings/:id` — auth (owner or admin)
Cancels (soft): sets `status=cancelled`, clears `slots`.
- `200 { "data": { ...booking, "status": "cancelled" } }`
- `403` not owner · `404` · `409 INVALID_STATE` if already cancelled or ended

## Postman
Import `postman/workspace-scheduler.postman_collection.json` and `postman/local.postman_environment.json`. Run "Auth → Demo login (user)" first; it stores `token`. Run the whole collection with the Collection Runner (or `newman run ...`) to execute all tests, including the 409 conflict case.
