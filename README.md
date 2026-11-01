# LOCK IN

A personal study sanctuary: an immersive Lock-In Room with a focus timer, music, ambient environments and companions, plus a dashboard that turns every session into visible progress.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (timer, stats, streaks, reports, notes, achievements, rewards, backup merge)
npm run build      # static site in dist/ — works on any static host (GitHub Pages etc.)
```

The built site must be served over http(s). Opening `dist/index.html` directly from disk won't work, because browsers block module scripts and YouTube embeds from `file://`.

## Status

| Phase | Scope | Status |
|---|---|---|
| 1 | Shell, dashboard, Lock-In Room, timer, music, environments, companions, Lights Off, distractions, reflections, persistence, backups | **Done** |
| 2 | Focus Reports (stats, daily/weekly/monthly + subject charts, consistency heatmap, filterable history), Study Notes (search, subject/status filters, update-from-reflection) | **Done** |
| 3 | Achievements: 24 across hours, long-term milestones, consistency, sessions and deep work; unlock celebrations (legendary for 1,000h); the road to 1,000 hours; unlock history | **Done** |
| 4 | Rewards earned through achievements (no currency): 10 room decorations, 4 unlockable environments, 3 new companions (1 free); rewards gallery; optional Supabase account sync | **Done** (sync needs the one-time Supabase setup below) |

## Architecture

```
src/
  domain/     Pure logic + types, no browser APIs. Unit-tested.
              timer.ts (timestamp-based), stats.ts, reports.ts, notes.ts, achievements.ts, rewards.ts, milestones.ts, presets.ts, time.ts
  data/       Storage boundary. db.ts (IndexedDB via Dexie, versioned schema),
              repo.ts (Repo<T> interface), hooks.ts (live queries),
              settings.ts (localStorage prefs), backup.ts / merge.ts (export/import)
  features/
    session/    Live session store: survives navigation, refresh and closed tabs
    audio/      YouTube music channel, Web Audio ambience synth, audio store
    scenes/     10 animated environments (CSS/SVG/canvas, no image assets)
    companions/ Timer ring, candle, plant
    room/       Lock-In Room page, side panels, completion/reflection
    dashboard/  Mission Control
    reports/    Focus Reports
    notes/      Study Notes + editor
    achievements/ Collection page, badges, unlock watcher + celebrations
    rewards/    Decorations layer, rewards gallery, unlock hooks
  sync/       Cloud sync: engine (tested), IndexedDB adapter, Supabase adapter, account store
    settings/   Preferences, subjects, presets, data & backup
  ui/         Shared controls (toggle, slider, stepper, confirm dialog, toasts) and charts/
  styles/     Design tokens + global styles
```

### Data reliability
- **Timer**: stores `endsAt` / `pausedAt` timestamps and derives remaining time from the clock. Background tabs, minimised windows and sleep can't make it drift.
- **Live session**: mirrored to localStorage on every change, so a refresh restores it exactly. If it ended while the tab was closed, it's saved and the reflection screen appears on your next visit.
- **Saving**: a finished session is written into the snapshot (`pendingSave`) first, then to IndexedDB. Saves are keyed by session id, so retrying is always safe.
- **Sync-ready records**: every record has `id`, `createdAt`, `updatedAt` and a soft-delete `deletedAt`. A future cloud sync can merge devices last-write-wins, using the same function backup import uses (`data/merge.ts`).
- **Backups**: Settings → Your data offers JSON backup, CSV export of sessions, and import (merge).

## Design system
Cozy dark academia with premium minimalism. Everything comes from tokens in . Pages never hard-code their own colours, sizes or timings.
- **Colour:** walnut surfaces, warm charcoal, beige and cream text, amber/gold accents, lavender as the secondary accent (links, reference lines, "next time" bookmarks). Tier metals: bronze, silver, gold, platinum (lavender-tinted) and legendary gold.
- **Type:** DM Serif Display for headings, Inter for interface text, JetBrains Mono for timers and statistics. Labels are small caps with wide tracking.
- **Shape and depth:** a 4px spacing grid, restrained radii (3–14px), three shadow levels, hairline rules instead of boxes where possible, and a faint paper grain.
- **Motion:** 120/200/360/700ms on one easing curve. Page fade-ins, bar and progress growth, modal and toast entrances. Everything respects .
- **Room theming:** each environment defines an accent , a glass  and  colours (). The room derives every surface from them with .
- **Pixel art:** small hand-drawn sprites () for the brand mark, the streak flame and the achievement emblems.

## Achievements
- **Derived, then kept.** `unlockTimeline()` replays your sessions in order and finds the exact session where each threshold was crossed. That moment is the unlock date, so achievements earned before Phase 3, or restored from a backup, get honest dates.
- **Permanent.** Unlocks are stored (IndexedDB `achievements`, included in backups) and never revoked, even if you later delete sessions. If older history arrives later (e.g. an import), dates move back to the true crossing.
- **Celebrations** never appear during a focus session. More than three at once (first launch, big import) are summarised in one card. Restored unlocks are not celebrated again.
- Session milestones count full sessions only; "finished early" sessions still count toward hours.

## Rewards
Every reward unlocks with a specific achievement (`domain/rewards.ts`). Nothing is bought and there is no currency. Because achievement unlocks are permanent, rewards are too. Earned decorations appear in the room automatically and can be switched off in the Decor panel. Locked environments and companions are visible in their panels with what unlocks them. If a locked choice arrives in a backup from another device, the room falls back to the defaults until it's earned here.

## Account sync (optional, Supabase)
Sign in with an emailed code in Settings → Account & sync, and sessions, reflections, notes, subjects, presets, achievement unlocks and preferences sync across every device signed in with that email. A running timer stays on its own device. Without a Supabase project configured, the app is local-only and never loads the sync library.

**How it works** (`src/sync/`): each device pushes records changed since its last push, then pulls everything changed after its server cursor. The server keeps a row only if it's newer (`lockin_push` in `supabase/schema.sql`), so an older edit can't overwrite a newer one. Achievement unlocks merge instead: the earliest date wins, and once one device has celebrated an unlock, no other device celebrates it again. Sync runs on start, every minute, on tab focus, when you come back online, and a few seconds after any change. Offline changes wait and go up later.

**One-time setup**
1. Create a free project at supabase.com.
2. SQL Editor → paste `supabase/schema.sql` → Run.
3. Authentication → URL Configuration: set **Site URL** to the hosted app (e.g. `https://xinezz.github.io/gfd3d3qu555x60/`) and add `http://localhost:5173/` under Redirect URLs.
4. (Optional, needs custom SMTP) Authentication → Email Templates → **Magic Link**: add `Your code: {{ .Token }}` so the email also carries a 6-digit code. On the free built-in sender templates are locked; the default email's **Sign in** link works on its own (open it on the device you're signing in on). The built-in sender only emails your Supabase account's own address and allows a few emails per hour.
5. Project Settings → API (or "Data API"): copy the **Project URL** and the **anon / publishable** key. Both are designed to be public; row-level security keeps each account's rows private.
6. Hosted site: GitHub repo → Settings → Secrets and variables → Actions → **Variables**: add `SUPABASE_URL` and `SUPABASE_ANON_KEY`, then re-run the deploy (or push). Local dev: copy `.env.example` to `.env.local` and fill in the same two values.

"Delete all data" while signed in also deletes your cloud rows. Other signed-in devices keep their own local copies until you clear them there.

## Charts
Hand-built (no chart library). Subject colours are a categorical palette validated for colour-blind separation and contrast against the dark card surface. The heatmap uses a single amber ramp with fixed thresholds (under 30m … 3h+), so its colours keep the same meaning as your history grows. Every bar and cell has a hover/focus tooltip, and charts include a screen-reader table.

## Audio sources and limitations
- **Lo-Fi Hip Hop, Chill, Jazz, Ambient, Piano, Classical**: official YouTube IFrame player streaming Lofi Girl, Chillhop and other 24/7 channels, with 2–3 streams per category. If one fails, the next is tried. Streams need internet, can be taken down, and may show ads. You can also paste any YouTube link. The player is shown as a small "now playing" card, since YouTube expects it to be visible, and can be minimised.
- **Rain, Brown Noise, Nature, and every environment's room sound**: generated live in the browser with the Web Audio API. They work offline and never disappear. Café and library are synthesised approximations (murmur, cup clinks, page turns, clock ticks), not recordings.
- Browsers block audio until you click. After a page refresh mid-session, the room shows a "Resume music & sound" button.

## Hosting
Every push to `main` runs the tests, builds, and deploys to GitHub Pages (`.github/workflows/deploy.yml`). The site asks search engines not to index it (`robots.txt` + a `noindex` meta tag).

Your data lives in the browser, per site address. The hosted site and `localhost:5173` keep **separate** data, as do different browsers and devices. To move data, use Settings → Export backup on one and Import backup on the other.
