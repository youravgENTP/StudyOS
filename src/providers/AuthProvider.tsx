import { type ReactNode } from 'react'
import { neonClient } from '../lib/neon/client'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = neonClient.auth.useSession()
  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
}
