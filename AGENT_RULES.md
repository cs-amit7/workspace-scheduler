# AGENT_RULES — read this before every task

You are helping build **Smart Workspace Scheduler**: a MERN app to browse and book rooms/desks. Docs in `docs/` are the source of truth (PRD, ARCHITECTURE, DESIGN, API, TASKS, TESTING, DEPLOYMENT, DECISION_LOG).

## Stack (do not change without a Decision Log entry)
Client: Vite, React, Tailwind, React Router, fetch (no axios). Server: Node (ESM), Express, Mongoose, Zod, Passport (`passport-google-oauth20`), jsonwebtoken, helmet, express-rate-limit, cookie-parser. Tests: Jest + Supertest + mongodb-memory-server (server), Vitest + React Testing Library (client).

## Golden invariants (never break)
1. **Double-booking is prevented by the database**: unique partial index on `Booking {resource, slots}` where `status:'confirmed'`. Never replace it with find-then-insert, in-memory locks, or client-side checks.
2. Booking times are **30-min aligned**, 30 min–4 h, not in the past, ≤ 30 days ahead.
3. **All timestamps are UTC ISO** in DB and API. Convert to local only in the UI (`client/src/utils/time.js`).
4. Booking status badges (Upcoming/Active/Completed) are **computed**, never stored.
5. Cancelling = `status:'cancelled'` + `slots: []` (soft). Resources are soft-disabled.
6. Responses follow the envelope in `docs/API.md` (`{data, meta}` / `{error:{code,message,details}}`).

## Conventions
- Controllers are thin; business logic lives in `services/`; pure helpers in `utils/`.
- Validate every body/query/param with Zod via the `validate` middleware.
- Throw `ApiError(code, status, message, details)`; only the error middleware writes error responses.
- Never log secrets or tokens. No stack traces in production responses.
- Auth token: httpOnly cookie (`token`); also accept `Authorization: Bearer`. Never store tokens in localStorage or URLs.
- Names: camelCase code, kebab-case files for client components' folders optional, PascalCase React components.
- Small functions, early returns, meaningful names; comments explain *why*.
- Accessibility: labelled inputs, keyboard support, aria on the slot grid, no colour-only meaning.

## Do NOT
- Add dependencies not listed above without asking (explain why and add a Decision Log entry).
- Touch files outside the current phase's scope.
- Commit `.env`, secrets, or `node_modules`.
- Build out-of-scope features (notifications, recurring bookings, payments, calendar sync).
- Weaken or delete tests to make them pass.
- Enable `ENABLE_DEMO_ADMIN` in production config.

## Workflow for every task
1. Read the relevant doc section(s) and the current phase in `docs/TASKS.md`.
2. Post a short plan (files to touch, risks) before coding.
3. Implement in small, reviewable diffs.
4. Add/adjust tests with the code. Run `npm run lint` and `npm test` in the affected package(s).
5. Report: files changed · how to verify · anything uncertain.
6. If you deviate from the docs, stop and propose a Decision Log entry rather than silently diverging.

## Commands
```
server: npm run dev | npm test | npm run lint | npm run seed
client: npm run dev | npm test | npm run lint | npm run build
postman: newman run postman/workspace-scheduler.postman_collection.json -e postman/local.postman_environment.json
```

## Definition of done
Lint + tests pass · behaviour matches docs · docs/Decision Log updated if needed · no secrets · tasks ticked in `docs/TASKS.md`.
