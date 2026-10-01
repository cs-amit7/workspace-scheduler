# Design — Smart Workspace Scheduler

## 1. Principles
1. **Availability first** — the answer to "what's free?" is visible within one glance.
2. **No dead ends** — every state (loading, empty, error, conflict) has clear copy and a next action.
3. **Don't rely on colour alone** — badges carry text; booked slots carry a pattern/label.
4. **Mobile-first** — usable at 360 px.

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
┌────────────────────────────────────────────────────────┐
│ Workspace Scheduler        Dashboard  My Bookings  (A) │
├────────────────────────────────────────────────────────┤
│ [Type ▾] [Capacity ≥ _] [Amenities ▾] [Date][From][To] │
├────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│ │ Orion Room   │ │ Desk A-12    │ │ Nova Room    │     │
│ │ Room · 8     │ │ Desk · 1     │ │ Room · 12    │     │
│ │ Floor 2      │ │ Floor 1      │ │ Floor 3      │     │
│ │ [WiFi][Proj.]│ │ [WiFi][Mon.] │ │ [WiFi][TV]   │     │
│ │ [View slots] │ │ [View slots] │ │ [View slots] │     │
│ └──────────────┘ └──────────────┘ └──────────────┘     │
│                    « 1 2 3 »                           │
└────────────────────────────────────────────────────────┘
```

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

## 6. Visual tokens (Tailwind)
| Token | Value |
|---|---|
| Primary | `indigo-600` (hover `indigo-700`) |
| Surface | `white` / `slate-50` page background |
| Text | `slate-900` / `slate-600` secondary |
| Success / Warning / Danger | `emerald-600` / `amber-500` / `rose-600` |
| Radius / shadow | `rounded-xl` / `shadow-sm` |
| Font | Inter (system fallback) |
| Spacing | 4-pt scale via Tailwind |

Dark mode: optional stretch goal, not in v1.

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
