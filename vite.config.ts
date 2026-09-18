import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const authUrl = env.VITE_NEON_AUTH_URL ?? env.NEON_AUTH_BASE_URL ?? ''
  const dataApiUrl = env.VITE_NEON_DATA_API_URL ?? env.NEON_DATA_API_URL ?? ''

  return {
    // Only these public endpoints are copied into browser code. Database
    // connection strings are deliberately never mapped or exposed.
    define: {
      'import.meta.env.VITE_NEON_AUTH_URL': JSON.stringify(authUrl),
      'import.meta.env.VITE_NEON_DATA_API_URL': JSON.stringify(dataApiUrl),
    },
    plugins: [
      react(),
      VitePWA({
        // StudyOS does not currently need offline caching. More importantly,
        // an old app-shell cache can keep a stale auth client alive after a
        // production deploy. Publish a one-time cleanup worker that removes
        // the existing registration and all caches instead.
        selfDestroying: true,
        registerType: 'autoUpdate',
        manifest: {
          name: 'StudyOS',
          short_name: 'StudyOS',
          description: 'A calm personal system for studying and daily planning.',
          theme_color: '#f6f7f8',
          background_color: '#f6f7f8',
          display: 'standalone',
        },
      }),
    ],
  }
})
