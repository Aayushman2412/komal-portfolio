# Komal Singh: portfolio

An interactive story drawn by Komal. Every visual is one of her six frames; the site cuts them into
layers and animates them ("I will draw this frame and give it to you; you add animation to it").
[BRIEF.md](BRIEF.md) has what she asked for on both calls, her notes, and how they map to the build.

1. **The feed** (frame 1). The site opens on a black page, then `feed.ai`: a grid of the same drawn
   dress, scrolling upward on its own like an endless feed. Three indicators only: `generating N
   looks/sec`, `style: trending`, `originality score`. Scrolling makes the feed faster.
2. **The glitch** (frame 2). It stutters; her colour bands, black bars and slipped heads flash in;
   SIGNAL LOST; her jagged black edge sweeps across. Power cut. No TV.
3. **The bulb** (frame 3). In the dark, the bulb in the corner of her drawing flickers and catches,
   and the view pulls back from it into the room: nani's carved almirah in a pink-orange haze.
4. **Open it.** The upper doors (cut from her drawing) swing open and the view goes in.
5. **Inside** (frame 4). Folded clothes, the floral tin, dust in the light, and the scrapbook.
6. **The scrapbook** (frames 5 and 6). It comes out to you closed (*Komal's Fashion World*), opens
   on "Komal, age 7", then About me and the school-notebook index. Her tabs, her "turn" flap and her
   index rows are clickable. Project pages use her blank page with a polaroid that lifts to show a
   note, an envelope with the concept note, a paper tab that pulls out the spec sheet, and fabric
   swatches that zoom in.

The cursor is a needle with thread, everywhere.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Dev server on http://localhost:5290. `npm run build` type-checks and builds to `dist/`;
`npm run preview` serves the build on port 5291.

## When Komal sends something new

| She sends | Do this |
|---|---|
| A new version of a frame | Save it as `art-src/frame-N.webp` (1620x1080), run `python scripts/slice-art.py` (needs `pip install numpy scipy pillow`) |
| Her projects | Edit `projects` in [`src/content/site.ts`](src/content/site.ts); photos go in `public/projects/<slug>/` |
| Fabric photos | Set `src` on a swatch in `site.ts`; it replaces the drawn stand-in |
| Contact details | `contact` in `site.ts` |
| AI-made photos for the feed (she mentioned this on the 18 Oct call) | Replace `public/art/feed/card-NN.webp`, keeping the sizes |

Every place in her frames the site uses (the bulb, the doors, the almirah and scrapbook outlines,
the tabs and index rows) is in [`src/content/regions.json`](src/content/regions.json), in the
frames' own pixels. The slicer and the site both read it.

## Links

| Link | Opens |
|---|---|
| `/` | the full story |
| `/#almirah` | skips to the room |
| `/#book` | the scrapbook |
| `/#index` | the index (send this one to recruiters) |
| `/#p/<slug>` | a project spread, e.g. `/#p/project-01` |

Returning visitors get "skip to the almirah" instead of "skip intro". `prefers-reduced-motion`
starts in the room. `?motion=force` overrides that for testing.

## How it is built

| Piece | How | Where |
|---|---|---|
| Her frames, cut into layers | Python (numpy, scipy, Pillow), WebP out | `scripts/slice-art.py` → `public/art/` |
| Placing a frame on any screen, zooms | `fitFrame` / `frameTransform`: cover the screen without cropping what matters, a blurred copy behind | `src/lib/art.ts` |
| The feed and its glitch | one canvas 2D: her cards, her header pieces, her band textures | `src/scenes/Feed.tsx` |
| Dark, bulb, pull-back, doors | CSS transforms and a radial mask over her frame 3 | `src/scenes/Room.tsx` |
| Inside, dust, the book's flight | DOM + a small dust canvas, GSAP | `src/scenes/Inside.tsx` |
| The scrapbook | DOM + CSS 3D page turns over her page images | `src/ui/scrapbook/` |
| Needle and thread | canvas, a verlet rope | `src/ui/Cursor.tsx` |
| Scroll scrubbing | Lenis + GSAP ScrollTrigger | `src/lib/scroll.ts` |
| Story state | zustand | `src/state/store.ts` |
| Sound (synthesised, off by default) | Web Audio | `src/lib/audio.ts`, `src/lib/bulbSound.ts` |

The timing of every beat is in one place: `beats` in `src/state/store.ts`.
