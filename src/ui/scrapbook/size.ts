import { COVER } from '../../lib/textures/cover'

/** Page size for the DOM scrapbook. Desktop shows spreads (two pages), phones one page at a time. */
export const PAGE_ASPECT = COVER.w / COVER.h

export function pageSize(vw = window.innerWidth, vh = window.innerHeight) {
  const mobile = vw < 768
  const h = mobile ? Math.min(vh * 0.74, (vw * 0.9) / PAGE_ASPECT) : Math.min(vh * 0.82, (vw * 0.88) / (2 * PAGE_ASPECT))
  return { w: h * PAGE_ASPECT, h, mobile }
}
