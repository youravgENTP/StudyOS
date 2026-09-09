import { useState, type FormEvent, type ReactNode } from 'react'
import { signInWithEmail, signInWithGoogle } from '../../lib/neon/auth'
import { useAuth } from '../../providers/auth-context'
import './auth.css'

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Authentication failed. Please try again.'
}

export function AuthGate({ children }: { children: ReactNode }) {
  const session = useAuth()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  if (session.isPending) return <div className="auth-loading">Opening StudyOS…</div>
  if (session.data) return children

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    const form = new FormData(event.currentTarget)
    try {
      await signInWithEmail({ email: String(form.get('email')), password: String(form.get('password')) })
    } catch (caught) {
      setError(message(caught))
    } finally {
      setPending(false)
    }
  }

  async function google() {
    setPending(true)
    setError('')
    try { await signInWithGoogle() } catch (caught) { setError(message(caught)); setPending(false) }
  }

  return <main className="auth-page"><section className="auth-panel"><div className="brand auth-brand"><span className="brand-mark">S</span>StudyOS</div><div><div className="eyebrow">Private workspace</div><h1>Welcome back</h1><p>Sign in to your personal StudyOS account.</p></div><form onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="email" required /></label><label>Password<input name="password" type="password" autoComplete="current-password" required /></label>{error && <div className="auth-error" role="alert">{error}</div>}<button className="button primary" disabled={pending}>{pending ? 'Please wait…' : 'Sign in'}</button></form><div className="auth-divider"><span>or</span></div><button className="button" onClick={google} disabled={pending}>Continue with Google</button></section></main>
}
