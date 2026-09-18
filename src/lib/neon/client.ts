import { createClient } from '@neondatabase/neon-js'
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters'
import { neonConfig } from './config'

// One client owns both Neon Auth and Data API access. The SDK retrieves the
// current Auth JWT and injects it into Data API requests automatically.
// Production auth is routed through the app origin so browser privacy settings,
// extensions, and installed-PWA contexts cannot block it as a third-party call.
const authUrl = import.meta.env.PROD ? `${window.location.origin}/api/auth` : neonConfig.authUrl

export const neonClient = createClient({
  auth: { adapter: BetterAuthReactAdapter(), url: authUrl },
  dataApi: { url: neonConfig.dataApiUrl },
})
