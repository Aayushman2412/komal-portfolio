import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const page = (file: string) => fileURLToPath(new URL(file, import.meta.url))

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // the story, and each project's own page (project.html#<slug>), opened from the book
      input: { main: page('./index.html'), project: page('./project.html') },
      output: {
        manualChunks(id) {
          if (id.includes('gsap') || id.includes('lenis')) return 'motion'
        },
      },
    },
  },
})
