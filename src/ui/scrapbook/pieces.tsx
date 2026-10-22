import { piece } from '../../content/site'
import { place, Print } from './bits'

/**
 * Her own pieces, cut from her project pages (scripts/slice-projects.py), stuck around a project's
 * spread like the rest of the scrapbook: her Pantone chips, her labels and stickers from her boards,
 * and prints of her line-up or collection that can be looked at closely (`print`, taped down, or
 * `bare` where she cut it out). Positions are in page percent; `under` pieces go below the note and
 * polaroids, the rest on top.
 */
type Piece = { cut: string; x: number; y: number; w: number; r?: number; print?: boolean; bare?: boolean; tape?: 1 | 2; under?: boolean }

export const pieces: Record<string, { left: Piece[]; right: Piece[] }> = {
  'project-01': {
    left: [
      // her four Pantone chips, as on the edge of her INSPIRATION board
      { cut: 'chip-yellow', x: 61, y: 10.5, w: 15, r: -6 },
      { cut: 'chip-green', x: 77.5, y: 10, w: 12.5, r: 5 },
      { cut: 'chip-olive', x: 62.5, y: 17, w: 12.5, r: 4 },
      { cut: 'chip-pink', x: 73.5, y: 17.5, w: 17, r: -3 },
    ],
    right: [
      { cut: 'lineup', x: 62, y: 10.5, w: 31, r: 4, print: true, tape: 2 },
      { cut: 'embellishment', x: 69, y: 68.5, w: 16, r: -8 },
    ],
  },
  'project-02': {
    left: [
      // I AM My own MUSE, her lettering in the mouth on her cover
      { cut: 'muse', x: 67, y: 8.5, w: 19, r: 8 },
      { cut: 'chip-red', x: 85, y: 12, w: 7, r: 9, under: true },
      { cut: 'label-edgy', x: 3.5, y: 60, w: 13, r: -10 },
    ],
    right: [
      { cut: 'collection', x: 64, y: 9.5, w: 22, r: 4, print: true, bare: true },
      { cut: 'chip-denim', x: 86, y: 25, w: 8, r: -8, under: true },
      { cut: 'lips-1', x: 69, y: 67.5, w: 14, r: -6 },
    ],
  },
}

export function Pieces({ slug, side, under = false }: { slug: string; side: 'left' | 'right'; under?: boolean }) {
  return (
    <>
      {(pieces[slug]?.[side] ?? [])
        .filter((p) => !!p.under === under)
        .map(({ cut, print, bare, tape, under: _, ...pos }) => {
          const c = piece(slug, cut)
          return print ? (
            <Print key={cut} src={c.url} alt={c.alt} size={[c.w, c.h]} tape={tape} bare={bare} {...pos} />
          ) : (
            <img key={cut} className={`sticker ${under ? 'sticker--under' : ''}`} src={c.url} alt="" draggable={false} style={place(pos)} />
          )
        })}
    </>
  )
}
