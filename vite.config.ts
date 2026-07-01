import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import neon from './neon-vite-plugin.ts'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

/** Stamps a unique build ID into sw.js so the browser detects a new SW on every deploy. */
function stampServiceWorker(): import('vite').Plugin {
  return {
    name: 'stamp-service-worker',
    apply: 'build',
    closeBundle() {
      const buildId = (process.env.VERCEL_GIT_COMMIT_SHA ?? Date.now().toString(36)).slice(0, 10)
      const swSource = resolve('public/sw.js')
      if (!existsSync(swSource)) {
        return
      }

      const stamped = readFileSync(swSource, 'utf8').replace(
        /const CACHE_VERSION = '[^']+'/,
        `const CACHE_VERSION = 'money-diary-${buildId}'`,
      )

      const candidates = [
        '.output/public/sw.js',
        'dist/public/sw.js',
        'dist/sw.js',
        '.vercel/output/static/sw.js',
      ]

      let wrote = false
      for (const candidate of candidates) {
        if (!existsSync(candidate)) {
          continue
        }
        writeFileSync(candidate, stamped)
        wrote = true
      }

      if (!wrote) {
        const fallbackDir = resolve('.output/public')
        mkdirSync(fallbackDir, { recursive: true })
        writeFileSync(resolve(fallbackDir, 'sw.js'), stamped)
      }
    },
  }
}

const buildSiteUrl =
  process.env.VITE_SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined)

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  define: {
    'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(
      (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.APP_BUILD_ID ?? 'dev').slice(0, 10),
    ),
    ...(buildSiteUrl
      ? { 'import.meta.env.VITE_SITE_URL': JSON.stringify(buildSiteUrl) }
      : {}),
  },
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
