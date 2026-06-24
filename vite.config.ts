import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import neon from './neon-vite-plugin.ts'
import { existsSync, readFileSync, writeFileSync } from 'fs'

/** Stamps a unique build ID into sw.js so the browser detects a new SW on every deploy. */
function stampServiceWorker(): import('vite').Plugin {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const buildId = (process.env.VERCEL_GIT_COMMIT_SHA ?? Date.now().toString(36)).slice(0, 10)
      const candidates = ['.output/public/sw.js', 'dist/public/sw.js', 'dist/sw.js']
      for (const p of candidates) {
        if (existsSync(p)) {
          const content = readFileSync(p, 'utf8')
          writeFileSync(p, content.replace(/money-diary-[^\s'"]+/, `money-diary-${buildId}`))
          break
        }
      }
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    ...(process.env.VERCEL ? [] : [neon]),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
    stampServiceWorker(),
  ],
})

export default config
