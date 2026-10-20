# Komal Singh: portfolio

An interactive story built from Komal's brief on the 15 Oct 2026 call (see [BRIEF.md](BRIEF.md) for
the transcript summary and her two sketches).

1. **The feed.** The site opens as a glossy AI fashion app. As you scroll, the generated designs
   multiply, regenerate faster, start to look the same, and the app begins to glitch.
2. **The TV.** The camera pulls back. It was all on an old grey CRT in a dark room. The picture
   drains to grey and rolls, then switches off: a white-hot line, a dot, darkness.
3. **The room.** A bare bulb flickers on over a red-oxide floor and a steel almirah with childhood
   stickers, a suitcase and a carton on top. Click to open it.
4. **The almirah.** Clothes on wire hangers (cloth physics; brush them with the cursor), folded
   stacks, the cookie tin sewing kit, and her scrapbook glowing on the shelf.
5. **The scrapbook.** It flies out to you and becomes a real book: cover, about her, an index with
   sewing buttons, project spreads with flippable polaroids and pinked fabric swatches, the plan,
   and an inland-letter contact page.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Dev server on http://localhost:5290. `npm run build` type-checks and builds to `dist/`;
`npm run preview` serves the build on port 5291.

## Editing content

Everything Komal will want to change is in [`src/content/site.ts`](src/content/site.ts): her name,
the intro captions, the about page, contact details, and the `projects` list. Each project needs a
`slug`, `title`, `year`, `story`, `notes`, two `swatches` and up to three `images`. Put photos in
`public/projects/<slug>/` and reference them as `/projects/<slug>/photo.jpg`. Empty image slots show
as "photo to come" polaroids. The index, page numbers and deep links follow the list automatically.

The childhood photo for the first page goes in `public/photos/` and in `about.photo`.

## Links

| Link | Opens |
|---|---|
| `/` | the full story |
| `/#almirah` | skips to the room |
| `/#book` | the scrapbook cover |
| `/#index` | the index (send this one to recruiters) |
| `/#p/<slug>` | a project spread |

Returning visitors get "Skip to the almirah" instead of "Skip intro". `prefers-reduced-motion`
starts in the room. `?motion=force` overrides that for testing.

## How it is built

| Piece | Library | Where |
|---|---|---|
| 3D scene, render loop | three.js, React Three Fiber, drei | `src/three/` |
| The AI feed (one instanced draw call, diffusion-style denoise shader) | custom GLSL | `src/three/feed/Feed.tsx` |
| CRT picture, glitch, power-off line | custom GLSL on the TV screen | `src/three/tv/CrtTv.tsx` |
| Bloom, grain, vignette, chromatic aberration, ACES tone mapping | postprocessing, @react-three/postprocessing | `src/three/Effects.tsx` |
| Cloth on hangers | hand-written verlet solver | `src/three/almirah/Cloth.tsx` |
| Scroll scrubbing, prompt scramble, door and page easing | GSAP (ScrollTrigger, ScrambleText, CustomEase) | `src/lib/scroll.ts`, `src/ui/` |
| Smooth wheel scrolling | Lenis | `src/lib/scroll.ts` |
| Story state | zustand | `src/state/store.ts` |
| Sound (all synthesised, no files) | Web Audio API | `src/lib/audio.ts` |
| Every texture (AI renders, textiles, walls, steel, stickers, the cover) | canvas 2D, drawn at load | `src/lib/textures/` |
| The scrapbook | DOM + CSS 3D page turns, container-query units | `src/ui/scrapbook/` |

The timing of every story beat is in one place: `beats` in `src/state/store.ts`. The camera's five
framings are in `src/three/CameraRig.tsx`; furniture positions are in `src/three/layout.ts`.

No images or video files are needed for the intro: everything is generated, so the site loads about
360 KB of gzipped JavaScript plus fonts. Real photographs will be the only heavy assets.
