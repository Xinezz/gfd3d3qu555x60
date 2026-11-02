# Environments

The Lock-In Room can be set in any of several environments. Four study rooms come first in the
Scene panel (Fireplace Study, Rainy Day Café, Midnight Library, Cosy Bedroom); the other places sit
under "More places", and four of those are unlocked by achievements.

## How it works

| Piece | File | Job |
| --- | --- | --- |
| Configuration | `src/features/scenes/catalog.ts` | One entry per environment: id, name, blurb, group, ambience layers, accent colours, optional reward lock, optional painted art. No drawing code. |
| Scene manager | `src/features/scenes/sceneManager.ts` | Which environment is active. Resolves the saved id (unknown or locked → the default, Fireplace Study), switches environment, and notifies the room sound. |
| Renderer | `src/features/scenes/Scene.tsx` | Draws the active environment behind the room and cross-fades between environments. |
| Artboard | `src/features/scenes/Board.tsx` | The 16:9 artboard a room is drawn or painted on, with its lights, effects and clickable things placed on it. |
| Painted art | `src/features/scenes/PaintedScene.tsx` | A painting (responsive images) on the artboard. |
| Illustrations | `src/features/scenes/illustrations/` | The code-drawn version of each environment: `<id>.tsx` plus `<id>.css`, shared shapes in `primitives.tsx`, the registry in `index.ts`. |
| Effect settings | `src/features/scenes/fx.ts` | What a scene may do now: animations, particles, lighting, calm mode, time of day. |
| Time of day | `src/features/scenes/timeOfDay.ts` | Morning, afternoon or night, from the clock or your choice. |
| Interactions | `src/features/scenes/interactions.ts` | The state of the things you can click (a lamp, the fire). |
| Room sound | `src/features/audio/synth.ts`, `audioStore.ts` | Generated ambience layers, mixed and cross-faded. |
| Selection panel | `src/features/scenes/EnvironmentPicker.tsx`, `picker.css` | The cards in the room's Scene panel. |
| Storage | `src/data/settings.ts` | Environment, time of day, effect settings and your ambience mix are settings (localStorage): they survive a refresh, go into backups and sync with the other preferences. |

**Painted or drawn.** An environment with `art` shows its painting. Without it, or if the painting
fails to load, the room shows the environment's illustration. So paintings can be added one at a time
and nothing ever shows a blank room.

**Switching.** Only `environmentId` changes. The timer, the session and the music live in their own
stores and are never touched. The new environment fades in over the old one, which stays fully drawn
underneath until the fade has finished, so there is no flash or empty frame. The accent colours ease
across and the room sound cross-fades over 1.5 s. With reduced motion turned on, the switch is
instant.

## The living room

### The artboard

Every study room is laid out on a 1600 × 900 (16:9) artboard that covers the room, cropped around its
`focus` point. A `SceneLayout` places things on it in percent of the artboard, so they stay put at
any screen size, and it's the same for a drawing or a painting:

- `lights`: soft glows (fire, candle, lamp, window, moon). Each has a strength per time of day, can
  change colour with the time of day (a window is gold in the morning, blue at night) and can follow
  a hotspot (a lamp switched off).
- `effects`: particles kept inside a region (rain only on the window glass, embers over the fire,
  dust in the light), and steam rising from a cup.
- `hotspots`: optional things to click. A `cycle` hotspot steps through states (a lamp: warm, dim,
  off); a `pulse` hotspot plays a one-off reaction (a puff of steam). They're real buttons, so they
  work from the keyboard and screen readers, and they never touch the timer.

The artboard carries `tod-morning | tod-afternoon | tod-night` and `data-<hotspot>="<state>"`, so a
room's CSS can recolour the sky or dim a lamp shade.

### Lighting

Lights are radial glows blended with `screen` over the artwork, under the room's vignette, so they
warm the picture without washing out the text. Fire and candles flicker on two clocks of different
lengths, which multiply into a pattern that doesn't visibly repeat; lamps hold steady with the odd
brief dip; window and moonlight drift slowly. Settings → Environment can switch lighting off or
change its strength (`--light-intensity`).

### Time of day

Morning (6:00–11:59), afternoon (12:00–17:59) or night. Auto follows the clock but never moves the
room on by itself during a focus session: the change waits for the break. Choosing a time yourself
(Auto included) applies straight away. Each study room recolours its walls, window and sky, and its
lights change strength and colour. Daylight rooms are dimmed a little more behind the timer so text
stays readable. The "More places" are drawn as they are and don't change with the time of day.

### Room sound

Each environment lists its `ambience` layers (e.g. the café: rainfall, café ambience, distant
chatter). They play together; in the Music or Scene panel each can be switched on or off and given
its own volume, under the overall room-sound volume, and your mix is remembered per environment.
Every sound is generated in the browser (nothing to download), loops without a seam and starts only
after you've interacted with the page. Switching environment cross-fades: layers the new room doesn't
have fade out, new ones fade in, and a layer both share (wind) simply carries on.

### Animation settings

Settings → Environment: scene animations, floating particles, lighting effects (and strength),
calmer motion (half the particles, gentler movement) and reduce motion. Reduce motion, or the
operating system's reduced-motion setting, stops movement across the site. Each switches off on its
own and the room still works.

### Performance

Moving parts are drawn as their own small layers on top of the static room, and animate with
`transform` and `opacity`, so the browser moves them without repainting the whole picture. Particles
are one canvas per effect, sized to its region, paused while the tab is hidden and drawn once (not
animated) with animations or motion off. Nothing is created per frame. Rooms are only drawn while the
Lock-In Room is open.

## Adding an environment

1. Add an entry to `ENVIRONMENTS` in `catalog.ts`. Use `group: 'study'` to list it with the study
   rooms. Give it `ambience` layers from the recipes in `src/features/audio/synth.ts`, or add one there.
2. Give it a picture, either or both:
   - an illustration: `illustrations/<id>.tsx` (and `<id>.css` for its own styles), registered in
     `illustrations/index.ts`. For lights, effects and hotspots, draw it inside a `Board` with an
     exported `LAYOUT` (see the four study rooms);
   - a painting: put the files in `public/environments/<id>/` and describe them in `art` (see below).
3. Run `npm test`. It checks that ids are unique, that every environment can be drawn, that layouts
   are consistent, and that every file an `art` entry names exists in `public/`.

To lock it behind an achievement, add a reward in `src/domain/rewards.ts` and set `reward` on the
entry.

## Painted artwork

Nothing is painted yet: every environment uses its code-drawn illustration. To add a painting,
export it as below and add `art` to the environment's entry. `art` is a `SceneLayout` too, so the
painting gets its own lights, effects and hotspots, for example:

```ts
art: {
  dir: 'environments/cafe',
  widths: [1280, 1920, 2560, 3840],
  formats: ['avif', 'webp'],
  focus: [50, 60],
  lights: [{ x: 50, y: 30, r: 35, color: '#5d6f9a', kind: 'window' }],
  effects: [{ particles: 'rain', region: [8, 10, 46, 52], density: 0.6 }],
  hotspots: [{ id: 'cup', kind: 'pulse', label: 'Coffee cup: stir up some steam', region: [80, 70, 5, 8] }],
},
```

### Files per environment

In `public/environments/<id>/`:

| File | Size | Notes |
| --- | --- | --- |
| `plate-1280.avif`, `plate-1920.avif`, `plate-2560.avif`, `plate-3840.avif` | 16:9 at those widths | The browser picks the width the screen needs. |
| `plate-1280.webp` … `plate-3840.webp` | same | The fallback (the last format listed is the fallback). |
| `thumb.webp` | 480 × 270 | The picker card. |

Aim for the 2560 AVIF to be under about 400 KB. Only list widths and formats that exist; the test fails otherwise.

### Composition

- **16:9, painted at 3840 × 2160.** Screens crop the painting around `focus` (percent across, percent
  down), so keep important detail within the middle 60% of the width. A phone held upright shows only
  about a quarter of the width, so clickable things near the edges are out of reach there.
- **Keep the centre calm.** The timer sits in the middle of the screen, the controls and dock below
  it, and the title in the top-left. On desktop, an open panel covers the right-hand 400 px. Put the
  fire, windows and lamps to the sides or the lower third, in mid-to-dark values. The room also adds
  its own dark vignette.
- **Leave room for movement.** Rain, embers, dust, sparks and steam are drawn by the app over the
  painting, each in its own region. Paint windows, hearths and cups so these effects have somewhere to
  go: a clean window pane, the space above a fire or a cup.
- **Things that sway are separate layers.** A painting can't move its own curtains or plants. Supply
  those as transparent PNG/WebP layers (same 16:9 canvas) if they should move.
- **One world.** Use warm, earthy colours and the same brush style and light direction in every
  environment, so they feel like rooms in one place. Each environment's `glow` (the UI accent) should
  be taken from its painting's main light.

### Still needed

| Environment | What the painting should show | Moves in the app |
| --- | --- | --- |
| Fireplace Study | A stone or brick hearth with a low fire in the lower centre, armchair, rug, bookshelves, candles on the mantel, an arched window. | Flames (a separate layer), candle flames, embers, sparks, firelight. |
| Rainy Day Café | Large windows with rain and a blurred city street outside, counter and espresso machine, wooden tables and chairs, hanging plants, warm pendant lights, a cup on a table. | Rain and droplets on the glass, a reflection crossing it, steam from the cups, swaying plants (separate layers), pendant glow. |
| Midnight Library | Tall bookshelves, large arched windows with curtains, moonlight falling across the floor, wooden ladders, reading desks with green or brass desk lamps. | Dust in the moonlight, curtains (separate layers), the light on the floor, lamp glow. |
| Cosy Bedroom | Study desk with books, stationery and a lamp, bed with cushions and a sleeping cat, a window with curtains and a view, plants, string lights. | Clouds outside (a separate layer), curtains and plants (separate layers), the cat breathing (a separate layer), lamp glow. |

For a day/night look in the painted rooms, either paint each room three times (morning, afternoon,
night) or paint it at night and rely on the lighting layer; the app supports the second today.
Supporting a plate per time of day is a small change to `PaintedArt` once paintings exist.
