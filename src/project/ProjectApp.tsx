import { useEffect, useState } from 'react'
import { detailFor } from '../content/projects/details'
import { Cursor } from '../ui/Cursor'
import { Lightbox } from './Lightbox'
import { ProjectIndex, ProjectView } from './ProjectView'

/** The project in the link: project.html#project-01 (the book's own form, #p/project-01, works too). */
const slugInHash = () => decodeURIComponent(location.hash.replace(/^#\/?(p\/)?/, ''))

export function ProjectApp() {
  const [slug, setSlug] = useState(slugInHash)
  const d = detailFor(slug)

  useEffect(() => {
    const go = () => {
      setSlug(slugInHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', go)
    return () => window.removeEventListener('hashchange', go)
  }, [])

  useEffect(() => {
    document.title = d ? `${d.title} · Komal Singh` : 'Projects · Komal Singh'
  }, [d])

  return (
    <>
      {d ? <ProjectView key={d.slug} d={d} /> : <ProjectIndex />}
      <Lightbox />
      <Cursor />
    </>
  )
}
