# Testing — Smart Workspace Scheduler

## 1. Strategy
| Layer | Tool | Scope |
|---|---|---|
| Unit (server) | Jest | `utils/slots.js`, `time.js`, validators, booking rules |
| Integration (server) | Jest + Supertest + mongodb-memory-server | Every endpoint, auth, roles, error envelope |
| Concurrency | Jest + Supertest | Parallel booking race (the headline test) |
| Unit (client) | Vitest + React Testing Library | `status.js`, `time.js`, `StatusBadge`, `SlotGrid`, forms |
| API black-box | Postman / Newman | Contract + conflict scenarios against local and deployed API |
| Manual UAT | Checklist (§6) | Full flows in the browser |
| CI | GitHub Actions | lint + all automated tests on every push/PR |

Targets: ≥ 80% coverage on `server/src/services` and `server/src/utils`. Report real numbers; do not inflate.

## 2. Unit test cases
**slots.js**
- Aligned start/end → expected slot array length (e.g. 10:00–11:30 → 3 slots)
- Misaligned minutes (10:15) → rejected
- end ≤ start → rejected
- Duration 30 min OK; 4 h OK; 4 h 30 m rejected
- Crossing midnight UTC works

**Booking rules**
- Past start rejected; start more than 30 days ahead rejected
- Disabled resource rejected (`INVALID_STATE`)

**status.js (client)**
- `now < start` → Upcoming; `now == start` → Active; `now == end` → Completed; cancelled overrides all.

## 3. Integration test matrix
| Area | Cases |
|---|---|
| Auth | demo login sets cookie; `/me` via cookie; `/me` via Bearer; no token → 401; tampered token → 401; demo admin blocked when flag off |
| Resources | list default; filter type/amenity/capacity; `availableFrom/To` excludes booked; pagination meta; get unknown id → 404; user create → 403; admin create/update/disable |
| Bookings | create 201; overlap 409 `SLOT_TAKEN` with conflict details; adjacent bookings (10–11 then 11–12) both OK; each 400 rule; list mine upcoming/past; cancel own → 200; cancel other's → 403; cancel twice → 409; rebook cancelled slot → 201; admin list |
| Errors | validation details present; unknown route 404 envelope; no stack trace when `NODE_ENV=production` |
| Rate limit | 31st rapid `POST /bookings` → 429 (use low limit in test config) |

## 4. Concurrency test (headline)
```js
// tests/concurrency/booking.race.test.js
test('25 parallel requests for one slot -> exactly one wins', async () => {
  const N = 25;
  const body = { resourceId, start, end };            // same slot for all
  const results = await Promise.all(
    Array.from({ length: N }, () =>
      request(app).post('/api/bookings').set('Authorization', `Bearer ${token}`).send(body))
  );
  const created  = results.filter(r => r.status === 201).length;
  const conflict = results.filter(r => r.status === 409).length;
  expect(created).toBe(1);
  expect(conflict).toBe(N - 1);
  expect(await Booking.countDocuments({ resource: resourceId, status: 'confirmed' })).toBe(1);
});
```
Also: two *overlapping but not identical* windows (10:00–11:00 vs 10:30–11:30) fired in parallel ⇒ exactly one succeeds. Run the suite repeatedly (10×) before trusting it. Make sure indexes are built before the test (`await Booking.syncIndexes()`).

## 5. Postman / Newman
Collection folders: **Auth**, **Resources**, **Bookings**. Each request has `pm.test` assertions on status, envelope shape and key fields. Notable scenarios: duplicate booking → 409; end before start → 400; misaligned → 400; past → 400; user creating a resource → 403; no token → 401; cancel twice → 409.

Run locally: `newman run postman/workspace-scheduler.postman_collection.json -e postman/local.postman_environment.json`
Run against prod: duplicate the environment, set `baseUrl` to the live `/api` URL (demo admin requests will 403 in prod by design — that is a passing check).

> Google's browser redirect can't be automated in Postman. Use `POST /auth/demo` for tokens in automated runs, and verify real Google login manually (UAT).

## 6. Manual UAT checklist
- [ ] Google login → dashboard shows my name/avatar; logout works; refresh keeps session
- [ ] Demo login works from a private window
- [ ] Filters (type, amenity, capacity, availability window) change results correctly; URL is shareable
- [ ] Slot grid reflects bookings; booked cells not clickable; keyboard navigation works
- [ ] Booking succeeds; appears in My Bookings as Upcoming
- [ ] Open the same resource in two browsers; book the same slot in both ⇒ second gets a clear conflict message
- [ ] Status badge flips Upcoming → Active → Completed (use a booking 30 min out, or temporarily mock time in dev)
- [ ] Cancel works; slot becomes free immediately
- [ ] Non-admin cannot reach `/admin`; admin CRUD works
- [ ] Times correct in a non-IST timezone (change OS/browser timezone)
- [ ] Mobile width (360 px) usable; Lighthouse accessibility ≥ 90 target
- [ ] Cold start: wait 15+ min, reload ⇒ UI shows the "waking up" notice, then loads

## 7. Test data
`npm run seed` creates resources; tests create their own data and clean up. Never run seed against production data you care about.

## 8. CI
`.github/workflows/ci.yml` runs on push/PR: `npm ci` → `npm run lint` → `npm test -- --coverage` for `server` and `client`. Merge only when green.

## 9. Exit criteria for "v1 done"
All automated tests green · concurrency test stable over 10 runs · Newman run green locally · UAT checklist ticked on the live site · coverage numbers recorded in `RESUME.md`.
