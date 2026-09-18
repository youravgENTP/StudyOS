import { neonClient } from './client'

export type EmailCredentials = { email: string; password: string }

export const getSession = () => neonClient.auth.getSession()
export const signInWithEmail = (credentials: EmailCredentials) =>
  neonClient.auth.signIn.email({ ...credentials, fetchOptions: { throw: true } })
export const signInWithGoogle = (callbackURL = window.location.origin) =>
  neonClient.auth.signIn.social({ provider: 'google', callbackURL, fetchOptions: { throw: true } })
export const updateProfile = (name: string) =>
  neonClient.auth.updateUser({ name, fetchOptions: { throw: true } })
export const requestPasswordReset = (email: string, redirectTo: string) =>
  neonClient.auth.requestPasswordReset({ email, redirectTo, fetchOptions: { throw: true } })
export const resetPassword = (newPassword: string, token: string) =>
  neonClient.auth.resetPassword({ newPassword, token, fetchOptions: { throw: true } })
export const signOut = () => neonClient.auth.signOut()
