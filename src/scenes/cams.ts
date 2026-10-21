import { fitFrame, regions } from '../lib/art'

/**
 * The two cameras after the intro, shared by the room and the inside of the almirah so they can
 * hand over at the doors without a cut.
 *   roomCam:   `z` zooms toward the doors, `k` brings them to the middle, `door` opens them.
 *   insideCam: `k` 0 = her inside drawing sits exactly in the open doorway, 1 = it fills the screen.
 */
export const roomCam = { z: 1, k: 0, door: 0 }
export const insideCam = { k: 0 }

/** How far the room zooms toward the doors before the inside drawing takes over. */
export const OPEN_ZOOM = 2

const [DL, DR] = [regions.room.doors.left, regions.room.doors.right]
export const DOORWAY = [DL[0], DL[1], DR[2], DR[3]]
export const DOORS_CENTRE: [number, number] = [(DL[0] + DR[2]) / 2, (DL[1] + DL[3]) / 2]

/**
 * The part of her inside drawing (frame 4) seen through the open doors, in frame-4 pixels: the
 * shelves with the clothes, the scrapbook and the tin, shaped like the doorway.
 */
const [dw, dh] = [DOORWAY[2] - DOORWAY[0], DOORWAY[3] - DOORWAY[1]]
const VIEW_H = 960
const VIEW_W = (VIEW_H * dw) / dh
const VIEW_CX = 852
export const INSIDE_VIEW = [VIEW_CX - VIEW_W / 2, 40, VIEW_CX + VIEW_W / 2, 40 + VIEW_H]

/** Where the room camera puts the doors' centre on screen right now (parallax fades out as it heads in). */
export function doorsTarget(vw: number, vh: number, pointer: { x: number; y: number }): [number, number] {
  const fit = fitFrame(vw, vh, regions.room.safe)
  const at = [fit.x + DOORS_CENTRE[0] * fit.s, fit.y + DOORS_CENTRE[1] * fit.s]
  const k = roomCam.k
  return [at[0] + (vw / 2 - at[0]) * k - pointer.x * 6 * (1 - k), at[1] + (vh / 2 - at[1]) * k + pointer.y * 4 * (1 - k)]
}

/** The open doorway on screen right now, from the room camera: [x, y, w, h]. */
export function doorwayOnScreen(vw: number, vh: number, pointer: { x: number; y: number }) {
  const s = fitFrame(vw, vh, regions.room.safe).s * roomCam.z
  const [cx, cy] = doorsTarget(vw, vh, pointer)
  return [cx + (DOORWAY[0] - DOORS_CENTRE[0]) * s, cy + (DOORWAY[1] - DOORS_CENTRE[1]) * s, dw * s, dh * s]
}
