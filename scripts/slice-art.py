"""
Cuts Komal's six drawn frames (art-src/frame-N.webp, 1620x1080) into the layers the site animates,
and writes them to public/art/. Run it again whenever she sends a new version of a frame:

    pip install numpy scipy pillow
    python scripts/slice-art.py

Every coordinate below is in the frames' own 1620x1080 pixels.
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src"
OUT = ROOT / "public" / "art"
REGIONS = json.loads((ROOT / "src" / "content" / "regions.json").read_text())
rng = np.random.default_rng(7)


def frame(n: int) -> np.ndarray:
    return np.asarray(Image.open(SRC / f"frame-{n}.webp").convert("RGB")).astype(np.float32)


def lum(a: np.ndarray) -> np.ndarray:
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def sat(a: np.ndarray) -> np.ndarray:
    mx, mn = a.max(-1), a.min(-1)
    return (mx - mn) / np.maximum(mx, 1)


def feather(mask: np.ndarray, px: float = 1.2) -> np.ndarray:
    """Soft 0..255 alpha from a boolean mask, so cut edges keep her grainy look instead of aliasing."""
    a = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(px))
    return np.asarray(a)


def save(rgb: np.ndarray, path: str, alpha: np.ndarray | None = None, q: int = 86) -> None:
    p = OUT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    if alpha is not None:
        img.putalpha(Image.fromarray(alpha.astype(np.uint8)))
    img.save(p, "WEBP", quality=q, method=6, alpha_quality=90)
    print(f"{path:32s} {img.size[0]}x{img.size[1]}  {p.stat().st_size // 1024} KB")


def polygon_cut(f: np.ndarray, pts: list, path: str) -> None:
    """A cut-out of one object (the almirah, the scrapbook) for its hover glow, in its own box."""
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    x0, y0, x1, y1 = min(xs) - 4, min(ys) - 4, max(xs) + 4, max(ys) + 4
    m = Image.new("L", (x1 - x0, y1 - y0), 0)
    ImageDraw.Draw(m).polygon([(x - x0, y - y0) for x, y in pts], fill=255)
    save(f[y0:y1, x0:x1], path, np.asarray(m.filter(ImageFilter.GaussianBlur(1.0))), q=88)
    print("   at", x0, y0)


def grain(h: int, w: int, base, amount: float, speck: float = 0.0) -> np.ndarray:
    """Her Procreate grain: fine noise plus sparse darker specks."""
    n = rng.normal(0, amount, (h, w, 1))
    img = np.ones((h, w, 3), np.float32) * np.array(base, np.float32) + n
    if speck:
        s = rng.random((h, w)) < speck
        img[s] *= 0.82
    return img


# ---------------------------------------------------------------- frame 1: the feed


def slice_feed() -> None:
    f = frame(1)
    L = ndimage.uniform_filter(lum(f), 9)
    cards = L < 205
    cards[:140] = False
    cards = ndimage.binary_opening(cards, iterations=3)
    cards = ndimage.binary_fill_holes(cards)
    lab, _ = ndimage.label(cards)
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        ys, xs = sl
        w, h = xs.stop - xs.start, ys.stop - ys.start
        # whole cards only: the third row runs off the bottom of the frame
        # (and not the one under the "generating" pill, which is drawn over its top edge)
        if 200 < w < 300 and 250 < h < 470 and ys.stop < 1000 and not (xs.stop > 1320 and ys.start < 222):
            boxes.append((xs.start, ys.start, xs.stop, ys.stop, i + 1))
    boxes.sort(key=lambda b: (b[0] // 200, b[1]))
    meta = []
    for k, (x0, y0, x1, y1, idx) in enumerate(boxes):
        pad = 4
        sl = (slice(y0 - pad, y1 + pad), slice(x0 - pad, x1 + pad))
        m = lab[sl] == idx
        # the dress hems leave thin slits up from each card's bottom edge; cards are convex, so
        # filling every row between its first and last pixel closes them
        for row in m:
            on = np.flatnonzero(row)
            if on.size:
                row[on[0] : on[-1] + 1] = True
        m = ndimage.binary_dilation(m, iterations=1)
        save(f[sl], f"feed/card-{k + 1:02d}.webp", feather(m, 1.0), q=84)
        meta.append((x1 - x0 + 2 * pad, y1 - y0 + 2 * pad))
    print("cards", meta)

    # the app chrome: cut the coloured/dark marks out of the grey header
    def chrome(name: str, x0: int, y0: int, x1: int, y1: int) -> None:
        a = f[y0:y1, x0:x1]
        m = (sat(a) > 0.2) | (lum(a) < 120)
        m = ndimage.binary_closing(m, iterations=2)
        m = ndimage.binary_fill_holes(m)
        m = ndimage.binary_dilation(m, iterations=1)
        save(a, f"feed/{name}.webp", feather(m, 0.8), q=90)

    chrome("logo", 38, 90, 148, 130)
    chrome("tabs", 626, 84, 1084, 138)
    chrome("avatar", 1522, 82, 1586, 138)


# ---------------------------------------------------------------- frame 2: the glitch


def slice_glitch() -> None:
    f = frame(2)
    # band textures, from a stretch with no dome on top; stripes run horizontally so they tile in x
    save(f[100:146, 4:96], "glitch/band-orange.webp", q=88)
    save(f[556:603, 6:64], "glitch/band-mint.webp", q=88)


# ---------------------------------------------------------------- frame 3: the room


def slice_room() -> None:
    f = frame(3)
    save(f, "room.webp", q=84)
    # the upper doors, to swing open
    for side in ("left", "right"):
        x0, y0, x1, y1 = REGIONS["room"]["doors"][side]
        save(f[y0:y1, x0:x1], f"room-door-{side[0]}.webp", q=88)
    polygon_cut(f, REGIONS["room"]["almirah"], "room-almirah.webp")


# ---------------------------------------------------------------- frame 4: inside


def slice_inside() -> None:
    f = frame(4)
    save(f, "inside.webp", q=84)
    polygon_cut(f, REGIONS["inside"]["book"], "inside-book.webp")


# ---------------------------------------------------------------- frames 5, 6: the book

SPINE = 810  # the faces split at the gutter between the two boards


def page_mask(f: np.ndarray) -> np.ndarray:
    """Everything that is not the dark table: the boards, tabs, rings and anything stuck past the edge."""
    L = ndimage.uniform_filter(lum(f), 7)
    m = L > 62
    m = ndimage.binary_opening(m, iterations=2)
    m = ndimage.binary_closing(m, iterations=6)
    m = ndimage.binary_fill_holes(m)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 400])
    return keep


def slice_book() -> None:
    for n, name in ((5, "s1"), (6, "s2")):
        f = frame(n)
        a = feather(page_mask(f), 1.0)
        save(f[:, :SPINE], f"book/{name}-l.webp", a[:, :SPINE])
        save(f[:, SPINE:], f"book/{name}-r.webp", a[:, SPINE:])

    # Blank pages for the project spreads: her boards, rings and paper, with the content replaced by
    # paper. The paper is a smooth fit of the bare margins plus her grain.
    f = frame(5)
    a = feather(page_mask(f), 1.0)
    blank = f.copy()
    # the corner flap pokes over the right board's border: take that corner from the left board,
    # mirrored (the boards are symmetric about the spine)
    blank[880:1006, 1470:1600] = f[880:1006, 20:150][:, ::-1]
    for x0, x1 in ((48, 778), (842, 1572)):
        y0, y1 = 118, 998
        area = blank[y0:y1, x0:x1]
        h, w = area.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        cy, cx = h / 2, w / 2
        r = np.sqrt(((yy - cy) / (h / 2)) ** 2 + ((xx - cx) / (w / 2)) ** 2)
        centre = np.array([214, 190, 178], np.float32)
        edge = np.array([176, 148, 136], np.float32)
        t = np.clip((r - 0.35) / 0.9, 0, 1)[..., None] ** 1.6
        paper = centre * (1 - t) + edge * t
        paper += rng.normal(0, 7, (h, w, 1))
        speck = rng.random((h, w)) < 0.05
        paper[speck] += rng.normal(0, 14, (speck.sum(), 1))
        # keep a few px of her own paper at the board edge, then blend into the fill
        inner = np.ones((h, w), bool)
        inner[:18], inner[-18:], inner[:, :18], inner[:, -18:] = False, False, False, False
        k = feather(inner, 8)[..., None] / 255
        blank[y0:y1, x0:x1] = area * (1 - k) + paper * k
    # the rings sit over the inner margins; put them back from the original
    rings = (sat(f) > 0.45) & (np.abs(np.arange(f.shape[1]) - SPINE)[None, :] < 75)
    rings = ndimage.binary_dilation(rings, iterations=2)
    blank[rings] = f[rings]
    save(blank[:, :SPINE], "book/blank-l.webp", a[:, :SPINE])
    save(blank[:, SPINE:], "book/blank-r.webp", a[:, SPINE:])

    # her washi tape and stickers, to dress the project pages
    def cut(n: int, name: str, x0: int, y0: int, x1: int, y1: int, test) -> None:
        g = frame(n)[y0:y1, x0:x1]
        m = test(g)
        m = ndimage.binary_opening(m, iterations=1)
        m = ndimage.binary_closing(m, iterations=3)
        m = ndimage.binary_fill_holes(m)
        lab, k = ndimage.label(m)
        if k:
            big = 1 + int(np.argmax(ndimage.sum(m, lab, range(1, k + 1))))
            m = lab == big
        save(g, f"book/{name}.webp", feather(m, 0.8), q=90)

    tape = lambda g: (lum(g) > 175) & ((g[..., 0] - g[..., 2]) > 18) | (lum(g) > 225)  # noqa: E731
    cut(5, "tape-1", 1122, 158, 1288, 222, tape)
    cut(5, "tape-2", 92, 150, 250, 278, tape)
    cut(6, "heart", 640, 392, 720, 450, lambda g: (g[..., 0] > 150) & (g[..., 1] < 110))
    cut(6, "smiley", 632, 478, 718, 552, lambda g: (g[..., 0] > 170) & (g[..., 1] > 150) & (g[..., 2] < 140) | (lum(g) < 120) & (g[..., 0] > 140))
    cut(5, "sparkle", 1296, 520, 1372, 604, lambda g: (g[..., 0] > 200) & (g[..., 1] > 190))


def cover() -> None:
    """The closed scrapbook, flattened out of frame 4 into a face the size of a page."""
    f = Image.open(SRC / "frame-4.webp").convert("RGB")
    # cover corners in frame 4: top-left, top-right, bottom-right, bottom-left
    quad = [(831, 236), (1097, 178), (1101, 566), (873, 564)]
    W, H = 780, 925  # the right board in frames 5 and 6
    # PIL's QUAD maps the output rectangle onto the source quad (ul, ll, lr, ur)
    flat = f.transform((W, H), Image.QUAD, data=(*quad[0], *quad[3], *quad[2], *quad[1]), resample=Image.BICUBIC)
    flat = np.asarray(flat).astype(np.float32)
    # her grain gets smeared by the stretch; put fresh grain back at the same strength
    flat += rng.normal(0, 9, (H, W, 1))
    face = np.zeros((1080, 1620 - SPINE, 3), np.float32)
    face[95 : 95 + H, 5 : 5 + W] = flat
    # same silhouette as the right board of the first spread, without its tabs
    m = page_mask(frame(5))[:, SPINE:].copy()
    m[:, 785:] = False
    yy, xx = np.mgrid[0:1080, 0 : 1620 - SPINE]
    m &= (yy >= 95) & (yy < 95 + H) & (xx >= 5) & (xx < 5 + W)
    save(face, "book/cover.webp", feather(m, 1.2), q=88)

    # the back cover: her cover's teal and its dark mottling, without the lettering and stickers
    teal = flat.reshape(-1, 3)
    teal = teal[(teal[:, 2] > teal[:, 0] + 40) & (teal[:, 1] > teal[:, 0] + 30)]
    base, dark = np.median(teal, 0), np.percentile(teal, 12, axis=0)
    field = ndimage.gaussian_filter(rng.random((H, W)), 3)
    field = (field - field.mean()) / field.std()
    blot = (np.clip((field - 0.9) * 1.2, 0, 1) * 0.55)[..., None]
    back = base * (1 - blot) + dark * blot
    yy, xx = np.mgrid[0:H, 0:W]
    edge = np.minimum.reduce([xx, W - 1 - xx, yy, H - 1 - yy]).astype(np.float32)
    back *= (0.62 + 0.38 * np.clip(edge / 170, 0, 1) ** 0.8)[..., None]
    back += rng.normal(0, 10, (H, W, 1))
    face = np.zeros((1080, 1620 - SPINE, 3), np.float32)
    # a back cover is a left face: its board sits against the spine on the right
    m = page_mask(frame(5))[:, :SPINE].copy()
    yy, xx = np.mgrid[0:1080, 0:SPINE]
    bx = SPINE - 5 - W
    face[95 : 95 + H, bx : bx + W] = back
    m &= (yy >= 95) & (yy < 95 + H) & (xx >= bx) & (xx < bx + W)
    save(face, "book/back.webp", feather(m, 1.2), q=86)


# ---------------------------------------------------------------- shared textures


def textures() -> None:
    """Tileable grain in the colours of her backgrounds (per-pixel noise tiles without seams)."""

    def sample(n: int, y0: int, y1: int, x0: int, x1: int) -> np.ndarray:
        a = frame(n)[y0:y1, x0:x1].reshape(-1, 3)
        return a.mean(0), a.std(0).mean()

    for name, (n, box), speck in (
        ("table", (5, (1028, 1078, 40, 1580)), 0.04),  # the dark table under the book
        ("feed-bg", (1, (150, 168, 40, 1580)), 0.10),  # the pale grey behind the feed cards
        ("black", (2, (300, 1000, 1100, 1600)), 0.0),  # the power cut
    ):
        mean, std = sample(n, *box)
        save(grain(512, 512, mean, max(4.0, std * 0.8), speck), f"{name}.webp", q=80)
        print(name, mean.round(), round(float(std), 1))


if __name__ == "__main__":
    slice_feed()
    slice_glitch()
    slice_room()
    slice_inside()
    slice_book()
    cover()
    textures()
