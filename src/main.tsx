import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/instrument-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource-variable/bodoni-moda'
import '@fontsource-variable/bodoni-moda/wght-italic.css'
import '@fontsource-variable/caveat'
import '@fontsource/gochi-hand'
import '@fontsource/special-elite'
import '@fontsource/permanent-marker'
import '@fontsource/vt323'
import 'lenis/dist/lenis.css'
import './styles/global.css'
import './styles/hud.css'
import './styles/scrapbook.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
