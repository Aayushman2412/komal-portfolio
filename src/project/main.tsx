import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/gochi-hand'
import '@fontsource-variable/caveat'
import '@fontsource/special-elite'
import '../styles/global.css'
import '../styles/project.css'
import { ProjectApp } from './ProjectApp'

/** A project's own page (project.html#<slug>), opened from the book. None of the story's scenes load here. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProjectApp />
  </StrictMode>,
)
