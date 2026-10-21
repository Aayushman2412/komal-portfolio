import regions from '../../content/regions.json'

/**
 * Page size for the scrapbook. A page is one half of her spread drawings (810x1080, with the dark
 * table around the board), so two pages side by side are exactly her frame. Desktop shows spreads;
 * phones show one page at a time.
 */
export const FACE = { w: regions.book.page[0], h: regions.book.page[1] }
export const FACE_ASPECT = FACE.w / FACE.h
/** The page controls along the bottom. */
export const NAV = 64

export function pageSize(vw = window.innerWidth, vh = window.innerHeight) {
  const mobile = vw < 768
  const room = vh - NAV - (mobile ? 16 : 8)
  const h = mobile ? Math.min(room, (vw - 8) / FACE_ASPECT) : Math.min(room, (vw - 24) / (2 * FACE_ASPECT))
  return { w: h * FACE_ASPECT, h, mobile }
}

/** Where the closed book's cover board sits on screen, so the book leaving the almirah can land on it. */
export function coverRect(vw = window.innerWidth, vh = window.innerHeight) {
  const { w, h } = pageSize(vw, vh)
  const x = vw / 2 - w / 2
  const y = (vh - NAV) / 2 - h / 2
  return { x: x + (w * 5) / FACE.w, y: y + (h * 95) / FACE.h, w: (w * 780) / FACE.w, h: (h * 925) / FACE.h }
}
