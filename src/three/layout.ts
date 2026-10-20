import * as THREE from 'three'

/** World layout in metres. Floor at y=0, back wall at z=-1.2. One place to move furniture. */
export const L = {
  wallZ: -1.2,
  table: new THREE.Vector3(-0.85, 0, -0.84),
  tableTop: 0.62,
  tv: new THREE.Vector3(-0.85, 0.62 + 0.25, -0.84),
  screen: { w: 0.44, h: 0.33, local: new THREE.Vector3(0, 0.035, 0.236) },
  almirah: new THREE.Vector3(0.78, 0, -0.93),
  almirahSize: { w: 0.92, h: 1.78, d: 0.5, plinth: 0.06 },
  bulb: new THREE.Vector3(0.22, 2.2, -0.12),
  shelfY: 0.74,
  rodY: 1.66,
}

export const screenWorld = () => L.tv.clone().add(L.screen.local)

/** The feed renders at 4:3 like the CRT it ends up on. */
export const FEED_ASPECT = 4 / 3
