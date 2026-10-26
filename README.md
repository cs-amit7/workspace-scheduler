# Smart Workspace Scheduler

Browse meeting rooms and study desks, check amenities, and book 30-minute slots — with **database-enforced protection against double-booking**.

<!-- TODO: replace after deploy -->
**Live demo:** _https://your-app.vercel.app_ · **API docs:** _Postman published link_ · ![CI](https://github.com/cs-amit7/workspace-scheduler/actions/workflows/ci.yml/badge.svg)

<!-- TODO: add screenshot / GIF of dashboard and slot grid -->

## Features
- Google OAuth 2.0 sign-in (+ one-click demo login), JWT in httpOnly cookie, user/admin roles
- Dashboard with amenity badges and filters (type, capacity, amenities, availability window)
- Day-view slot grid and booking form with clear conflict messages
- My Bookings with live **Upcoming / Active / Completed** status badges and cancellation
- Admin panel to add, edit and disable rooms/desks
- Rate limiting, Helmet, CORS whitelist, Zod validation, consistent error envelope

## How double-booking is prevented
Each booking stores the 30-minute slots it covers. A **unique partial index** on `{resource, slots}` (only for confirmed bookings) makes the database reject overlaps atomically — safe under concurrency and across multiple server instances. A test fires many parallel requests for one slot and asserts exactly one succeeds. Details: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#4-conflict-prevention-the-core), [ADR-004](docs/DECISION_LOG.md).

## Tech stack
| Layer | Tech |
|---|---|
| Frontend | React (Vite), Tailwind CSS, React Router |
| Backend | Node.js, Express, Mongoose, Passport (Google), JWT, Zod |
| Database | MongoDB Atlas |
| Testing | Jest, Supertest, Vitest, React Testing Library, Postman/Newman |
| CI/CD & hosting | GitHub Actions, Vercel, Render |

## Architecture
```
Browser → Vercel (React) ──/api rewrite──▶ Render (Express) ──▶ MongoDB Atlas
                                              └──▶ Google OAuth
```
React → Express route → service-layer rules → MongoDB (unique index decides) → `201`/`409` → UI updates.

## Getting started
**Prerequisites:** Node LTS, a MongoDB Atlas (or local) database, a Google OAuth client.

```bash
git clone https://github.com/cs-amit7/workspace-scheduler.git && cd workspace-scheduler

# API
cd server
cp .env.example .env      # fill in values (see below)
npm install
npm run seed              # sample rooms & desks
npm run dev               # http://localhost:5000

# Web (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173  (proxies /api to :5000)
```

### Environment variables (server)
| Name | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `GOOGLE_CALLBACK_URL` | `http://localhost:5173/api/auth/google/callback` (dev) |
| `CLIENT_URL` | `http://localhost:5173` (dev) |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `ENABLE_DEMO_ADMIN` | `true` locally/CI only |

Client: `VITE_API_BASE=/api`.

## Scripts
| Command | Where | What |
|---|---|---|
| `npm run dev` | server / client | Dev servers |
| `npm test` | server / client | Tests (add `-- --coverage`) |
| `npm run lint` | both | ESLint |
| `npm run seed` | server | Seed sample data (idempotent) |
| `newman run postman/workspace-scheduler.postman_collection.json -e postman/local.postman_environment.json` | root | API contract tests |

## API
Full reference: [`docs/API.md`](docs/API.md). Import [`postman/`](postman) into Postman, run **Auth → Demo login** first.

## Documentation
| Doc | Purpose |
|---|---|
| [PRD](docs/PRD.md) | Goals, stories, rules, NFRs |
| [Architecture](docs/ARCHITECTURE.md) | Data model, conflict logic, auth flow |
| [Design](docs/DESIGN.md) | Pages, components, wireframes, states |
| [API](docs/API.md) | Endpoints and examples |
| [Tasks](docs/TASKS.md) | Phased plan + AI-assistant prompts |
| [Testing](docs/TESTING.md) | Strategy, concurrency test, UAT |
| [Deployment](docs/DEPLOYMENT.md) | Vercel + Render + Atlas, free tier |
| [Decision Log](docs/DECISION_LOG.md) | Why things are the way they are |
| [Agent rules](AGENT_RULES.md) | Context file for the coding assistant |

## Deployment
Vercel (client) + Render (API) + MongoDB Atlas M0, all free tier. Render's free instance sleeps after 15 min idle, so the first request may take about a minute. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Roadmap
Email notifications · recurring bookings · per-resource business hours · refresh tokens · dark mode.

## License
MIT (add a `LICENSE` file).
