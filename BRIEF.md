# Komal's portfolio: brief

Sources, newest first. When they disagree, the newer one wins.

| When | What | Where |
|---|---|---|
| 21 Oct | **Third call**, her fixes after seeing the drawn build (2 min), and a corrected About/Index spread | [`docs/meet-3-transcript-en.txt`](docs/meet-3-transcript-en.txt); the new spread is [`docs/frames/6th.jpg`](docs/frames/6th.jpg) |
| after 18 Oct | **Her six drawn frames**, one per beat. These are the visuals. | [`docs/frames/`](docs/frames) (originals in `art-src/`) |
| after 18 Oct | **Her notebook pages**: the concept and the inside of the scrapbook | [`docs/notes-concept.jpg`](docs/notes-concept.jpg), [`docs/notes-scrapbook.jpg`](docs/notes-scrapbook.jpg) |
| 18 Oct | **Second call**, after she saw the first build (11 min, Hindi/English) | [`docs/meet-2-transcript-en.txt`](docs/meet-2-transcript-en.txt) |
| 15 Oct | First call, with her two Procreate sketches (32 min) | [`docs/meet-transcript-en.txt`](docs/meet-transcript-en.txt), [`docs/storyboard.jpg`](docs/storyboard.jpg), [`docs/book-plan.jpg`](docs/book-plan.jpg) |

All calls were transcribed with Whisper large-v3 in translate mode. Timestamps below are mm:ss into
the 18 Oct recording unless marked otherwise.

## Her fixes from the 21 Oct call

| Time | She said | Done |
|---|---|---|
| 00:00 | "I have to expand the photos." (Aayushman: her drawings should fill the screen.) | Every frame now covers the whole screen, kept centred on what matters (the almirah, the scrapbook) where a narrow screen crops it. No blurred bands. The open book is sized by its boards, not the table around them. |
| 00:14–00:23 | "When the cupboard opens, the box is empty. My zoom-in photo with clothes, portfolio, book, box should be there as soon as the cupboard opens." | Her inside drawing is behind the doors as they swing open; the view keeps moving in through the doorway and her drawing grows out of it to fill the screen, with no cut. Closing the almirah goes back out the same way. |
| 00:35 | "The last page has not been drawn properly." (Aayushman: the project and end pages.) | Rebuilt from her own pieces: her index paper with her own PROJECT 01–05 lettering, her red paper and tape, her stickers, her corner flap with her "turn" to go on. The contact page is a table like her index; the end page is white lettering on her red paper. |
| 00:40 | "Portfolio has changed its shape." | The closed book is her cover at the proportions she drew it (the first version stretched it 22% wider), with her page edges and tabs beside it. It flies out of the almirah as she drew it, straightens on the way and lands corner for corner on that shape. |
| 00:50 | "When the portfolio opens, it should look like a proper book." | It lies closed, then the cover swings open, heavier and slower than a page, on phones too. Under each side is a stack of board edges that thickens on whichever side has more pages, and the book casts a shadow on the table. |
| 00:59–01:05 | "The [page] noise should be the sound of the paper. And when you open it, it should sound like it is being opened." | Paper synthesised in `src/lib/paperSound.ts`: page turns are a corner lifting, a swish, crackle and a soft flop; the cover opening is the spine giving, a whoosh and a card flop, and shutting it is a slower whoosh and a heavier flop. |
| 01:16–01:30 | "Behind the almirah there are curves... those curve lines should move... those orange lines should move like this." | Her pink-and-orange swirls flow slowly (`src/scenes/RoomSwirl.tsx`, WebGL); the almirah, bulb and stars stay still. |
| (Aayushman) | Use the corrected About/Index drawing; the star's colours at the top were distorted. | Her new spread replaces the old one, and pages are now cut from the table by colour, so every tip of the star and its spray of dots keep their shape and colour, and the book is sized so the star stays on screen. |

## What she is saying with it

> "Everything is very corporate. It's the same fashion, same design, same polka dot. Even the makeup,
> the footwear, everything is the same, and there's no story behind it." (01:00)

> "Since I'm going into a designer's work, they want something which has a story, a concept, a meaning
> ... they want to connect with the garment through the story, not just because everyone is there."
> (01:16–01:31)

So the site argues one thing: **AI fashion is perfect, fast and identical; her work comes from a
story.** It opens inside the AI version of fashion, breaks it, and then walks into her childhood,
where her eye for clothes started ("since my childhood I have seen myself doing this, and my personal
style is also very storytelling", 02:01). The first call said the same (15 Oct, 16:31): "the field I
want to go into cares about storytelling", and she does not want AI to make her work (15 Oct, 14:01).

The second half is **Y2K-childhood nostalgia** (02:11) drawn "very grainy ... in a scribble way, like
a child draws" (02:32). The almirah carries her family: photos and stickers on it, her mother's love of
**red**, her mother's **embroidery** (02:58–03:21). That is why the almirah in her drawing is covered in
embroidery-like vines and why both pages of the first spread sit on red paper.

## How she wants it made

**She draws every frame; the site animates them** (06:42–07:47): "I don't want you to use these
animated photos. I really want myself to draw that ... I will draw this frame and give it to you. After
that you add animation to it, like make a video of that photo." Nothing in the story is generated or
3D any more; every visual is one of her drawings, cut into layers where something has to move. Her
lettering stays as she wrote it, inside the images.

## The story, beat by beat

| # | Beat | Her frame | What moves | Why (her words) |
|---|---|---|---|---|
| 1 | **Black page**, then the feed | — | The page opens black. | Notes: "site's open → black page" |
| 2 | **The feed**: `feed.ai`, tabs For you / Trending / Generate / Saved, a grid of the *same* dress | [1st](docs/frames/1st.jpg) | The grid scrolls upward on its own, an infinite feed; scrolling makes it faster and the counter climbs. | Notes: "grid of fashion images scrolling upward on its own [infinite feed]". Call: "too perfect" (01:39) |
| 2a | **Three indicators, nothing else** | 1st | `generating N looks/sec`, `style: trending`, `originality: 0.02` | "I don't want all these things. I want generating some number of looks per second, style trending, and originality 0 point something, like very less ... then he will understand" (09:12–09:40) |
| 3 | **The glitch**: the feed stutters, colour bands, SIGNAL LOST, a black tear eats the screen | [2nd](docs/frames/2nd.jpg) | Bars and bands flicker, the feed jerks, the black edge sweeps across. | Notes: "feed stutters → power cut & the screen becomes dark" |
| 4 | **Dark, then the bulb** | [3rd](docs/frames/3rd.jpg) (top left) | The bulb flickers, catches, and the view pulls back from it into the room. | Notes: "warm light flickers". Call: **no TV** (08:35–08:47) |
| 5 | **Nani's almirah** in a pink-orange haze, calendar, photo and "I ♥ NANI" stickers, "open it" | 3rd | Click to open: the doors swing and the view goes in. | Notes: "nani's wooden cupboard → stickers, magazine pages & height chart" |
| 6 | **Inside**: folded clothes, the floral tin, the scrapbook, "this one" | [4th](docs/frames/4th.jpg) | Dust in the light; the scrapbook answers the cursor; click to take it out. | "Old almirahs open like this and there is dust, and things are tied" (03:56). "I will see: oh, I made a scrapbook in my childhood about fashion" (04:05) |
| 7 | **The scrapbook cover**: *KOMAL'S FASHION WORLD, DON'T TOUCH MY STUFF!* | 4th | It comes to you and opens. | "Torn, brown in colour, like it used to be at that time" (04:13) |
| 8 | **Who she is**: her childhood dress drawing, "Komal, age 7", and today's portrait, "still drawing dresses, just bigger now." | [5th](docs/frames/5th.jpg) | "turn" → the page turns. Tabs ABOUT / INDEX / PROJECT jump ahead. | Notes: "Cover → WHO SHE IS? → real childhood drawing of a dress → Komal, age 7 → beside, recent photo" |
| 9 | **About me** and the **index**, a school-notebook contents table | [6th](docs/frames/6th.jpg) | Each index row opens its project; "PROJECT 01" turns the page. | "A typical school index page. I want exactly the same, like it used to be in school" (05:51) |
| 10 | **Projects 01–05** | — | Placeholder pages until she sends them. | "Project by project, I have decided how I want to do the project" (06:00). Notes: polaroid → handwritten note underneath; paper tab → hidden spec sheet; envelope → concept note; click the swatch → it zooms into the fabric texture |

Across all of it, **the cursor is a needle with thread**: "I don't want an arrow or anything, I want a
needle thread to act as the cursor" (04:34–04:44; notes: "the click → a needle with thread").

**Sound**: "I want as much nostalgia as possible" (07:57), and the clothes rustle goes (08:07–08:11).
What remains is old-house sound: the wall switch and bulb, the almirah creak, page turns.

## What changed from the first build (18 Oct)

- The 3D scene (CRT TV, steel almirah, cloth physics, generated textures) is gone; her frames replace it.
- No TV, no switch-off on a set: the feed glitches and blacks out on its own (08:35–08:47).
- No write-up over the feed: the `/imagine` prompt, captions, toasts and narration are gone (08:54–09:40).
- The almirah is her nani's carved wooden cupboard, not the steel/Godrej one discussed on the call
  (her notes cross out "Godrej almirah"; her drawing settles it).
- Cursor: needle and thread.

## Where the call and the drawings differ (the drawings win)

| On the call | In the drawings/notes | Built as |
|---|---|---|
| A Godrej almirah (02:50) | Nani's wooden cupboard | Drawing |
| Childhood clothes hanging, one dress (03:36–03:49) | Folded clothes and a tin box | Drawing |
| AI-generated photos in the feed (09:54) | One drawn dress repeated | Drawing. Swapping in AI photos later is a config change. |
| Cover says "who is she?" with "Komal, age 7" under her photo (04:50–05:27) | Cover is *Komal's Fashion World*; the first spread holds "Komal, age 7" and the quote | Drawing. "who is she?" is the first spread's name in the book's navigation. |
| The quote sits on the About page (05:36) | The quote sits beside her portrait, before About | Drawing |

## Still needed from Komal

- **Projects 01–05**: title, a short story, photos, the spec sheet, the concept note, fabric photos.
  Her index already promises 17 pages (01–04, 05–07, 08–11, 12–14, 15–17).
- **Contact**: email, Instagram, any other handles.
- Two small typos in her lettering, which only she can fix in the drawing: "SINAL LOST" (2nd) and
  "Orignality" (1st). The site's live text spells them correctly.
