import regions from '../../content/regions.json'

/**
 * Page size for the scrapbook. A page is one half of her spread drawings (810x1080, with the dark
 * table around the board), so two pages side by side are exactly her frame. The book is sized so
 * her boards, not the table around them, fill the screen (21 Oct: "expand the photos"); the table
 * margin runs off the edges into the same table. Desktop shows spreads; phones one page at a time.
 */
export const FACE = { w: regions.book.page[0], h: regions.book.page[1] }
export const FACE_ASPECT = FACE.w / FACE.h
/** The page controls along the bottom. */
export const NAV = 64

/**
 * Her boards inside a face: the y range to keep on screen, and the spread's full board width (both
 * boards, spine to edges). The range starts above the boards at the tips of her ABOUT ME star,
 * which she drew sticking out over the table.
 */
const BOARD = { y0: 9, y1: 1020, spreadW: 1570, pageW: 790 }
/** The closed scrapbook on the right-hand face: her cover, and the page edges and tabs beside it. */
export const COVER = { x: 5, y: 95, w: 640, h: 925, edgesW: 110 }
/** The back cover on the last (left-hand) face: as wide as the front one, against the spine. */
const BACK = { x: FACE.w - COVER.x - COVER.w, w: COVER.w }

export function pageSize(vw = window.innerWidth, vh = window.innerHeight) {
  // one page at a time on phones, and on any screen taller than it is wide
  const mobile = vw < 768 || vw < vh
  const room = vh - NAV - (mobile ? 24 : 18)
  const k = Math.min((vw - (mobile ? 12 : 24)) / (mobile ? BOARD.pageW : BOARD.spreadW), room / (BOARD.y1 - BOARD.y0))
  // the boards (and her star) sit in the middle of the space above the controls
  const top = (vh - NAV) / 2 - ((BOARD.y0 + BOARD.y1) / 2) * k
  return { w: FACE.w * k, h: FACE.h * k, k, top, mobile }
}

/** How far the stage slides (in page widths) when the book is closed, so the closed book (cover and edges) is centred. */
export const CLOSED_SHIFT = -(COVER.x + (COVER.w + COVER.edgesW) / 2) / FACE.w
/** The same at the back, where only the back cover shows. */
export const END_SHIFT = 1 - (BACK.x + BACK.w / 2) / FACE.w
/** One page at a time: the closed book and the back cover, centred on the page. */
export const SINGLE_COVER_SHIFT = 0.5 + CLOSED_SHIFT
export const SINGLE_BACK_SHIFT = END_SHIFT - 0.5

/** Where the closed book's cover sits on screen, so the book leaving the almirah can land on it. */
export function coverRect(vw = window.innerWidth, vh = window.innerHeight) {
  const { w, k, top, mobile } = pageSize(vw, vh)
  const faceLeft = mobile ? vw / 2 - w / 2 + SINGLE_COVER_SHIFT * w : vw / 2 + CLOSED_SHIFT * w
  return { x: faceLeft + COVER.x * k, y: top + COVER.y * k, w: COVER.w * k, h: COVER.h * k }
}
