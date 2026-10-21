import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/gochi-hand'
import '@fontsource-variable/caveat'
import '@fontsource/special-elite'
import 'lenis/dist/lenis.css'
import './styles/global.css'
import './styles/scenes.css'
import './styles/scrapbook.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
