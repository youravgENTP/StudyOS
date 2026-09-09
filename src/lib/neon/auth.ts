import { neonClient } from './client'

export type EmailCredentials = { email: string; password: string }
export type SignUpDetails = EmailCredentials & { name: string }

export const getSession = () => neonClient.auth.getSession()
export const signInWithEmail = (credentials: EmailCredentials) => neonClient.auth.signIn.email(credentials)
export const signUpWithEmail = (details: SignUpDetails) => neonClient.auth.signUp.email(details)
export const signInWithGoogle = (callbackURL = window.location.origin) =>
  neonClient.auth.signIn.social({ provider: 'google', callbackURL })
export const signOut = () => neonClient.auth.signOut()
