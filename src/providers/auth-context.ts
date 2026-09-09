import { createContext, useContext } from 'react'
import { neonClient } from '../lib/neon/client'

type AuthState = ReturnType<typeof neonClient.auth.useSession>
export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
