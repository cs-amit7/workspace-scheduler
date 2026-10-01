# Deployment — Smart Workspace Scheduler (all free tier)

_Free-tier facts below were checked against Render's and MongoDB's docs on 2026-10-01. Free plans change often — re-check before relying on them._

## 1. Platforms
| Part | Platform | Why | Free-tier caveats |
|---|---|---|---|
| Frontend (React SPA) | **Vercel** (alt: Netlify, Cloudflare Pages) | Git-push deploys, fast CDN, supports rewrites | Hobby plan is for personal/non-commercial use — fine for a portfolio |
| Backend (Express API) | **Render** Web Service, Free instance (alt: Koyeb, Railway — verify current free terms) | Simple Node deploys from GitHub | Spins down after **15 min** idle; wake-up takes about **1 min**; monthly free instance hours are limited; may restart anytime; ephemeral filesystem |
| Database | **MongoDB Atlas M0** | Permanent free cluster, replica set | **512 MB** storage; shared resources; connection cap applies (docs list ~100–500 — keep pool at 10); idle free clusters may be terminated per Atlas terms |
| OAuth | **Google Cloud Console** (OAuth client) | Free | Consent screen in "Testing" limits logins to listed test users |
| CI | **GitHub Actions** | Free for public repos | — |
| API docs | **Postman** published docs | Free | — |
| Optional uptime ping | UptimeRobot (free) | Reduces cold starts | A 5-min ping keeps the service awake but uses up free instance hours; fine for one service, verify the monthly quota |

## 2. Topology
```
Browser → https://<app>.vercel.app
            ├─ static React build
            └─ /api/*  ──(Vercel rewrite)──▶ https://<api>.onrender.com/api/*  ──▶ Atlas
```
Everything the browser sees is one origin, so cookies are first-party and Google's redirect URI stays on the Vercel domain.

## 3. Step-by-step

### A. MongoDB Atlas
1. Create account → **Create cluster → M0 Free** → pick a region near Render's region.
2. Database Access → add a user with a strong password (readWrite on `workspace`).
3. Network Access → allow `0.0.0.0/0` (Render free instances have no fixed IP). Compensate with a strong password and a least-privilege user.
4. Copy the connection string → `MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/workspace?retryWrites=true&w=majority`.
5. Run the seed once from your machine: `MONGODB_URI=... npm run seed --prefix server`.

### B. Render (API)
1. New → **Web Service** → connect GitHub repo → Root directory `server`.
2. Runtime Node; Build `npm ci`; Start `node src/server.js`; Instance type **Free**.
3. Health check path: `/api/health`.
4. Environment variables (Render dashboard):
   `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_CALLBACK_URL=https://<app>.vercel.app/api/auth/google/callback`,
   `CLIENT_URL=https://<app>.vercel.app`, `ADMIN_EMAILS=you@example.com`, `ENABLE_DEMO_ADMIN=false`.
5. Also set Express `app.set('trust proxy', 1)` so rate limiting and `Secure` cookies work behind Render's proxy.
6. Deploy; open `https://<api>.onrender.com/api/health`.

### C. Vercel (client)
1. Import repo → Root directory `client`; Framework Vite; Build `npm run build`; Output `dist`.
2. Env: `VITE_API_BASE=/api`.
3. Add `client/vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://<api>.onrender.com/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
(Order matters: the API rule must come first.)

### D. Google OAuth client
1. Google Cloud Console → new project → **APIs & Services → OAuth consent screen** (External). Add app name, support email; scopes `openid`, `email`, `profile`.
2. Credentials → **Create OAuth client ID → Web application**.
   - Authorized JavaScript origins: `http://localhost:5173`, `https://<app>.vercel.app`
   - Authorized redirect URIs: `http://localhost:5173/api/auth/google/callback` (dev proxy), `https://<app>.vercel.app/api/auth/google/callback`
3. Copy client ID/secret into Render env. While the consent screen is in *Testing*, add yourself as a test user; publish it (or rely on demo login for visitors) when ready.

### E. Wire up & verify
1. Update `CLIENT_URL`/`GOOGLE_CALLBACK_URL` if the Vercel domain changed; redeploy Render.
2. Smoke tests (live URL):
   - [ ] `/api/health` OK through the Vercel domain
   - [ ] Demo login works
   - [ ] Google login works (test user)
   - [ ] Book → conflict from second browser → cancel
   - [ ] Admin page blocked for demo user
   - [ ] Newman run against prod passes (demo-admin requests expected 403)
3. Add the live link to README and `RESUME.md`.

## 4. Local development
```bash
# terminal 1
cd server && cp .env.example .env && npm i && npm run seed && npm run dev   # :5000
# terminal 2
cd client && npm i && npm run dev                                           # :5173, proxies /api -> :5000
```
`.env.example` lists every variable in ARCHITECTURE §9 with dummy values. Never commit `.env`.

## 5. Release flow
Feature branch → PR → CI green → merge to `main` → Vercel and Render auto-deploy. Roll back via the platform's previous-deploy button.

## 6. Cold-start handling
- UI shows "Waking up the server…" after 3 s.
- Optional: UptimeRobot pings `/api/health` every 5 min (mind free-hours quota), or accept the cold start and mention it in the README.
- Retry once on network failure for idempotent GETs.

## 7. Troubleshooting
| Symptom | Likely cause |
|---|---|
| `redirect_uri_mismatch` | Redirect URI in Google console ≠ `GOOGLE_CALLBACK_URL` exactly |
| Login succeeds but `/me` is 401 | Cookie not set: missing `trust proxy`, wrong `CLIENT_URL`, or calling Render directly instead of via the Vercel rewrite |
| CORS errors | `CLIENT_URL` mismatch; or `VITE_API_BASE` points at Render directly |
| 502 / timeouts on first request | Render cold start |
| Mongo connection timeout | Atlas IP allowlist or wrong URI/user |
| Booking index missing in prod | Run `Booking.syncIndexes()` (seed script does this) |

## 8. Cost guardrails
All services on free plans, no card-required add-ons. Set Atlas and Render budget alerts if offered.
