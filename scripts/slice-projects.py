"""
Cut Komal's project pages into the pieces the site shows.

Her projects come as drawn scrapbook pages, 1620x1080 like her frames (the 22 Oct PDF, pages 7-10
for project 01 and 11-14 for project 02). Each project has a folder in art-src/projects/<slug>/
holding her pages (page-1.webp ...) and cuts.json, the list of pieces to cut from them:

    {
      "cuts": [
        {"name": "lineup", "page": 2, "box": [930, 175, 1510, 588], "alt": "Eleven looks, ..."},
        {"name": "chip-pink", "page": 2, "poly": [[44, 455], ...], "alt": "..."},
        {"name": "fabric-stripes", "page": 4, "box": [...], "kind": "texture", "alt": "..."}
      ]
    }

`box` is a rectangle in page pixels; `poly` cuts any shape (soft-edged alpha). kind "texture" is a
fabric close-up for a swatch (saved a little sharper). `"frame": true` marks a `poly` piece the site
shows whole in a frame (a print, a card, a polaroid): a hole in it would show the frame's white
backing, so the slicer warns when more than 2% of it is see-through. Pages and pieces go to
public/projects/<slug>/, and their sizes, boxes and alt text to src/content/projects/<slug>.art.json
for the site.

    python scripts/slice-projects.py               # every project
    python scripts/slice-projects.py project-01    # one
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src" / "projects"
OUT = ROOT / "public" / "projects"
MANIFESTS = ROOT / "src" / "content" / "projects"


def save(img: Image.Image, path: Path, q: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, quality=q, method=6)
    print(f"   {path.relative_to(ROOT)}  {img.width}x{img.height}  {path.stat().st_size // 1024} KB")


def cut(page: Image.Image, c: dict) -> Image.Image:
    if "poly" in c:
        pts = c["poly"]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs) + 1, max(ys) + 1
        m = Image.new("L", (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(m).polygon([(x - x0, y - y0) for x, y in pts], fill=255)
        out = page.crop((x0, y0, x1, y1)).convert("RGBA")
        out.putalpha(m.filter(ImageFilter.GaussianBlur(0.8)))
        return out
    return page.crop(tuple(c["box"])).convert("RGB")


def project(slug: str) -> dict:
    folder = SRC / slug
    spec = json.loads((folder / "cuts.json").read_text()) if (folder / "cuts.json").exists() else {"cuts": []}
    pages = sorted(folder.glob("page-*.webp"), key=lambda p: int(p.stem.split("-")[1]))
    print(slug)
    entry = {"pages": [], "cuts": {}}
    loaded = {}
    for p in pages:
        n = int(p.stem.split("-")[1])
        img = Image.open(p).convert("RGB")
        loaded[n] = img
        save(img, OUT / slug / "pages" / f"page-{n}.webp", q=86)
        entry["pages"].append({"src": f"projects/{slug}/pages/page-{n}.webp", "w": img.width, "h": img.height})
    for c in spec["cuts"]:
        piece = cut(loaded[c["page"]], c)
        q = 92 if c.get("kind") == "texture" else 88
        if c.get("frame") and piece.mode == "RGBA":
            clear = sum(piece.getchannel("A").histogram()[:128]) / (piece.width * piece.height)
            if clear > 0.02:
                print(f"   WARNING {c['name']} is {clear:.0%} see-through, and it is shown in a frame: stop its outline before what overlaps it")
        save(piece, OUT / slug / f"{c['name']}.webp", q=q)
        entry["cuts"][c["name"]] = {
            "src": f"projects/{slug}/{c['name']}.webp",
            "w": piece.width,
            "h": piece.height,
            "page": c["page"],
            "box": c.get("box") or [min(p[0] for p in c["poly"]), min(p[1] for p in c["poly"]), max(p[0] for p in c["poly"]) + 1, max(p[1] for p in c["poly"]) + 1],
            "alt": c.get("alt", ""),
            **({"kind": c["kind"]} if "kind" in c else {}),
        }
    return entry


if __name__ == "__main__":
    slugs = sys.argv[1:] or sorted(p.name for p in SRC.iterdir() if p.is_dir())
    MANIFESTS.mkdir(parents=True, exist_ok=True)
    for slug in slugs:
        out = MANIFESTS / f"{slug}.art.json"
        out.write_text(json.dumps(project(slug), indent=1) + "\n")
        print("wrote", out.relative_to(ROOT))
