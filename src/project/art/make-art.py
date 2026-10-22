"""
Two pieces of her blank spread (public/art/book/blank-l.webp, blank-r.webp) for the project pages:
one ring of her binding, keyed out by colour (red hearts, white rims, pink loop), and her board with
its outer half mirrored so neither side has rings (only its frame is used, as a CSS border image).
Run from the repo root: python src/project/art/make-art.py (needs numpy, scipy, pillow).
"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC = 'public/art/book/'
OUT = 'src/project/art/'
L = Image.open(SRC + 'blank-l.webp').convert('RGBA')
R = Image.open(SRC + 'blank-r.webp').convert('RGBA')

# the ring: both halves at the spine
sp = Image.new('RGBA', (220, 1080))
sp.alpha_composite(L.crop((700, 0, 810, 1080)), (0, 0))
sp.alpha_composite(R.crop((0, 0, 110, 1080)), (110, 0))
a = np.array(sp).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
m = ((r > 170) & (g < 90) & (b < 100)) | ((r > 180) & (b > 140) & (g < 170) & (r - g > 60)) | ((r > 225) & (g > 215) & (b > 215))
m = ndi.binary_opening(m, iterations=1)
lab, n = ndi.label(ndi.binary_dilation(m, iterations=2))
sizes = ndi.sum(m, lab, range(1, n + 1))
m &= np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s > 400])
m = ndi.binary_closing(m, iterations=2)
a[..., 3] = (ndi.gaussian_filter(m.astype(float), 0.7) * 255).clip(0, 255)
Image.fromarray(a.astype(np.uint8)).crop((40, 252, 182, 322)).save(OUT + 'ring.webp', quality=92)

# the board: her left page, its outer half mirrored; the middle flattened, since only the frame shows
half = np.array(L.crop((23, 100, 405, 1025)))
board = np.concatenate([half, half[:, ::-1]], axis=1)
board[40:-46, 40:-40, :3] = (195, 166, 152)
Image.fromarray(board).save(OUT + 'board.webp', quality=85)
