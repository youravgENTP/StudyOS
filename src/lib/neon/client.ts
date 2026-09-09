import { createClient } from '@neondatabase/neon-js'
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters'
import { neonConfig } from './config'

// One client owns both Neon Auth and Data API access. The SDK retrieves the
// current Auth JWT and injects it into Data API requests automatically.
export const neonClient = createClient({
  auth: { adapter: BetterAuthReactAdapter(), url: neonConfig.authUrl },
  dataApi: { url: neonConfig.dataApiUrl },
})
