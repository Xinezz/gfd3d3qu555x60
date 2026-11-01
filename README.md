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
| 4 | Rewards earned through achievements (no currency): 10 room decorations, 4 unlockable environments, 3 new companions (1 free); rewards gallery | **Done**, except account sync (needs a backend; see below) |

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

## Achievements
- **Derived, then kept.** `unlockTimeline()` replays your sessions in order and finds the exact session where each threshold was crossed. That moment is the unlock date, so achievements earned before Phase 3, or restored from a backup, get honest dates.
- **Permanent.** Unlocks are stored (IndexedDB `achievements`, included in backups) and never revoked, even if you later delete sessions. If older history arrives later (e.g. an import), dates move back to the true crossing.
- **Celebrations** never appear during a focus session. More than three at once (first launch, big import) are summarised in one card. Restored unlocks are not celebrated again.
- Session milestones count full sessions only; "finished early" sessions still count toward hours.

## Rewards
Every reward unlocks with a specific achievement (`domain/rewards.ts`). Nothing is bought and there is no currency. Because achievement unlocks are permanent, rewards are too. Earned decorations appear in the room automatically and can be switched off in the Decor panel. Locked environments and companions are visible in their panels with what unlocks them. If a locked choice arrives in a backup from another device, the room falls back to the defaults until it's earned here.

## Account sync (not built yet)
The data layer is ready for it (repositories, `updatedAt`/`deletedAt` on every record, last-write-wins merge in `data/merge.ts`). What's missing is a backend and an account, which you have to create yourself (e.g. a free Supabase or Firebase project). Until then, move data between devices with backup export/import.

## Charts
Hand-built (no chart library). Subject colours are a categorical palette validated for colour-blind separation and contrast against the dark card surface. The heatmap uses a single amber ramp with fixed thresholds (under 30m … 3h+), so its colours keep the same meaning as your history grows. Every bar and cell has a hover/focus tooltip, and charts include a screen-reader table.

## Audio sources and limitations
- **Lo-Fi Hip Hop, Chill, Jazz, Ambient, Piano, Classical**: official YouTube IFrame player streaming Lofi Girl, Chillhop and other 24/7 channels, with 2–3 streams per category. If one fails, the next is tried. Streams need internet, can be taken down, and may show ads. You can also paste any YouTube link. The player is shown as a small "now playing" card, since YouTube expects it to be visible, and can be minimised.
- **Rain, Brown Noise, Nature, and every environment's room sound**: generated live in the browser with the Web Audio API. They work offline and never disappear. Café and library are synthesised approximations (murmur, cup clinks, page turns, clock ticks), not recordings.
- Browsers block audio until you click. After a page refresh mid-session, the room shows a "Resume music & sound" button.

## Hosting
Every push to `main` runs the tests, builds, and deploys to GitHub Pages (`.github/workflows/deploy.yml`). The site asks search engines not to index it (`robots.txt` + a `noindex` meta tag).

Your data lives in the browser, per site address. The hosted site and `localhost:5173` keep **separate** data, as do different browsers and devices. To move data, use Settings → Export backup on one and Import backup on the other.
