# Design — Smart Workspace Scheduler

## 1. Principles
1. **Availability first** — the answer to "what's free?" is visible within one glance.
2. **No dead ends** — every state (loading, empty, error, conflict) has clear copy and a next action.
3. **Don't rely on colour alone** — badges carry text; booked slots carry a pattern/label.
4. **Mobile-first** — usable at 360 px.
5. **Dark, developer-flavoured theme** — inspired by coding-practice sites (dark panels, red/orange accent, hexagon badges, stat counters). Inspired by, not a copy: no third-party logos, names, copy or assets.

## 2. Routes & pages
| Route | Page | Access |
|---|---|---|
| `/login` | Login: "Sign in with Google" + "Try demo" | Public |
| `/` | Dashboard: filters + resource cards | Signed in |
| `/resources/:id` | Resource detail: info + date picker + slot grid + booking panel | Signed in |
| `/my-bookings` | Tabs: Upcoming / Past; cancel action | Signed in |
| `/admin` | Resource table + create/edit modal | Admin |
| `*` | 404 | Public |

Unauthenticated users hitting protected routes are redirected to `/login` and returned afterwards.

## 3. Components
`Navbar` · `ProtectedRoute` · `AdminRoute` · `ResourceCard` · `AmenityBadge` · `FilterBar` · `DatePicker` · `SlotGrid` · `BookingPanel` · `BookingCard` · `StatusBadge` · `ConfirmDialog` · `Toast` · `Skeleton` · `EmptyState` · `ErrorState` · `Pagination` · `ResourceForm`

## 4. Wireframes

### Dashboard
```
┌────────────────────────────────────────────────────────────┐
│ ◆ WORKSPACE   Dashboard  My Bookings  Admin        (avatar)│  dark top bar
├────────────────────────────────────────────────────────────┤
│  Find your spot.                    (red→orange gradient)  │  hero (slim)
│  Book rooms & desks in seconds.                            │
├──────────────┬──────────────┬──────────────┬───────────────┤
│  18  Open now│  3 Upcoming  │  12 Rooms    │  20 Desks     │  stat counters
├────────────────────────────────────────────────────────────┤
│ [Type ▾] [Capacity ≥ _] [Amenities ▾] [Date][From][To]     │
├────────────────────────────────────────────────────────────┤
│ ┃┌──────────────┐ ┃┌──────────────┐ ┃┌──────────────┐      │
│ ┃│ Orion Room ⬡8│ ┃│ Desk A-12  ⬡1│ ┃│ Nova Room ⬡12│      │  ┃ = type colour bar
│ ┃│ Floor 2      │ ┃│ Floor 1      │ ┃│ Floor 3      │      │  ⬡ = capacity hexagon
│ ┃│ [WiFi][Proj.]│ ┃│ [WiFi][Mon.] │ ┃│ [WiFi][TV]   │      │
│ ┃│ ● Open now   │ ┃│ ○ Busy       │ ┃│ ● Open now   │      │
│ ┃│ [View slots] │ ┃│ [View slots] │ ┃│ [View slots] │      │
│ ┃└──────────────┘ ┃└──────────────┘ ┃└──────────────┘      │
│                       « 1 2 3 »                            │
└────────────────────────────────────────────────────────────┘
```
Stat counters use **existing endpoints only** (no new API): *Open now* = `GET /resources?availableFrom=now&availableTo=now+30m` → `meta.total`; *Upcoming* = `GET /bookings/me?when=upcoming&limit=1` → `meta.total`; *Rooms/Desks* = `GET /resources?type=...&limit=1` → `meta.total`.

### Resource detail / booking
```
┌─────────────────────────────┬──────────────────────────┐
│ Orion Room · 8 seats        │ Book this room           │
│ [WiFi][Projector][Whiteboard]│ Date  [ 2026-10-05 ]    │
│                             │ Start [ 10:00 ▾ ]        │
│ Date: ‹ Mon 5 Oct ›         │ End   [ 11:30 ▾ ]        │
│ 08:00 ░ 08:30 ░ 09:00 ░     │ Duration: 1h 30m         │
│ 09:30 ░ 10:00 █ 10:30 █     │ [ Confirm booking ]      │
│ 11:00 █ 11:30 ░ ...         │ Conflict → inline error  │
│ █ selected  ▒ booked  ░ free│                          │
└─────────────────────────────┴──────────────────────────┘
```
Clicking a free cell sets start; clicking a second cell sets end (range highlight). Booked cells are disabled and labelled "Booked" for assistive tech.

### My Bookings
```
[ Upcoming | Past ]
┌──────────────────────────────────────────────┐
│ Orion Room            [Upcoming]   [Cancel]  │
│ Mon 5 Oct · 10:00–11:30 (your local time)    │
└──────────────────────────────────────────────┘
```

## 5. Status badges (computed on the client)
| Condition | Label | Style |
|---|---|---|
| `status = cancelled` | Cancelled | Grey, strikethrough time |
| `now < start` | Upcoming | Blue |
| `start ≤ now < end` | Active | Green (pulsing dot) |
| `now ≥ end` | Completed | Slate |

Badges refresh every 30 s via a shared `useNow()` hook.

## 6. Visual theme — dark, red/orange accent (Tailwind tokens)
Dark is the **default and only theme in v1**. Hex values are this project's own palette (inspired by the dark/red look of coding-practice sites, not copied from any brand). Verify contrast with a checker; adjust if any pair drops below 4.5:1.

| Token (`tailwind.config.js` → `theme.extend.colors`) | Value | Use |
|---|---|---|
| `bg` | `#0f1115` | Page background |
| `panel` | `#1a1d23` | Cards, tables, modals |
| `panel-2` | `#222630` | Hover/raised surfaces, inputs |
| `line` | `#2d323d` | Borders, dividers |
| `ink` | `#e6e8ec` | Primary text |
| `muted` | `#9aa1ad` | Secondary text |
| `brand` | `#d93a22` | Filled buttons (white text) |
| `brand-hover` | `#e5472f` | Button hover |
| `brand-text` | `#ff6a4d` | Links, active tab, accent text on dark |
| `amber` | `#f08a24` | Gradient end, warnings |
| `ok` | `#3ddc84` | Active / success / "Open now" |
| `info` | `#4aa3ff` | Upcoming |
| `danger` | `#ff5c5c` | Errors, conflicts |
| `type-room` / `type-desk` | `#ff6a4d` / `#4aa3ff` | Left colour bar on cards |

**Gradient:** `linear-gradient(135deg, #d93a22 0%, #f08a24 100%)` — hero banner and primary CTA only.

**Type:** Inter for UI; **JetBrains Mono** for times, IDs, counters and amenity chips (the "developer" feel). System fallbacks required.

**Shape & depth:** `rounded-lg`, 1 px `line` borders instead of heavy shadows, subtle `ring` on focus (`brand-text`, 2 px).

### Signature elements
- **Hexagon capacity badge** (CSS `clip-path`) on every card — number = capacity (desk = 1). Our nod to rank hexagons; purely decorative + `aria-label="Capacity 8"`.
- **Stat counters** strip under the hero (see Dashboard wireframe).
- **Type colour bar** on the left edge of each resource card.
- **Amenity chips** in mono font with a 1 px border, not filled.
- **Underlined tabs** (active = `brand-text` underline) for Upcoming/Past.
- **Slot grid:** free = `panel-2`; hover = border `brand-text`; selected range = `brand`; booked = diagonal-stripe pattern + "Booked" label (not colour alone).
- **Status badges** (dark variants): Upcoming `info`, Active `ok` with pulsing dot, Completed `muted`, Cancelled `muted` + strikethrough.
- **Tables (admin):** `panel` rows, `line` dividers, sticky header, row hover `panel-2`.
- **Top bar:** `panel` background, 1 px bottom `line`, wordmark in mono/bold with a `◆` mark (your own wordmark — not a copy of any logo), user avatar dropdown on the right.

Light mode: not in v1 (stretch goal; tokens are CSS variables so it can be added later).

## 7. States & copy
| State | Behaviour |
|---|---|
| Loading | Skeleton cards; "Waking up the server…" notice if a request exceeds 3 s (cold start) |
| Empty | "No resources match your filters." + *Clear filters* |
| Conflict (409) | Inline: "Someone just booked 10:00–10:30. Pick another slot." + refresh availability |
| Validation | Field-level messages from API `details` |
| Network error | Toast + *Retry* |
| Session expired (401) | Redirect to `/login` with notice |

## 8. Accessibility
Semantic landmarks; labelled inputs; slot grid is a `role="grid"` with arrow-key navigation and `aria-disabled` on booked cells; visible focus rings; contrast ≥ 4.5:1; toasts use `aria-live="polite"`; confirm dialog traps focus.

## 9. Responsive behaviour
- ≥1024 px: 3-column card grid; detail page two-column.
- 640–1023 px: 2 columns.
- <640 px: single column; booking panel becomes a sticky bottom sheet; slot grid scrolls horizontally inside its container.

## 10. Time display
UI shows the user's local time with the timezone label (e.g. "IST"); API payloads are always UTC ISO strings. Date-picker converts the chosen local day into a `[from, to)` UTC window for availability queries.
