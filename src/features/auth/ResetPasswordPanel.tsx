import { useState, type FormEvent } from 'react'
import { resetPassword } from '../../lib/neon/auth'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The password could not be reset. Please request a new link.'
}

export function ResetPasswordPanel() {
  const token = new URLSearchParams(window.location.search).get('token')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(token ? '' : 'This reset link is invalid or incomplete. Please request a new one from Settings.')
  const [complete, setComplete] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return

    const form = new FormData(event.currentTarget)
    const password = String(form.get('password'))
    const confirmation = String(form.get('confirmation'))
    if (password !== confirmation) {
      setError('The passwords do not match.')
      return
    }

    setPending(true)
    setError('')
    try {
      await resetPassword(password, token)
      setComplete(true)
    } catch (caught) {
      setError(errorMessage(caught))
    } finally {
      setPending(false)
    }
  }

  return <main className="auth-page">
    <section className="auth-panel">
      <div className="brand auth-brand"><span className="brand-mark">S</span>StudyOS</div>
      {complete ? <>
        <div><div className="eyebrow">Account security</div><h1>Password updated</h1><p>Your new password is ready to use.</p></div>
        <button className="button primary" onClick={() => window.location.assign('/')}>Return to StudyOS</button>
      </> : <>
        <div><div className="eyebrow">Account security</div><h1>Set a new password</h1><p>Use at least 8 characters. This link can only be used once.</p></div>
        <form onSubmit={submit}>
          <label>New password<input name="password" type="password" minLength={8} autoComplete="new-password" required disabled={!token} /></label>
          <label>Confirm new password<input name="confirmation" type="password" minLength={8} autoComplete="new-password" required disabled={!token} /></label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="button primary" disabled={pending || !token}>{pending ? 'Updating…' : 'Update password'}</button>
        </form>
        <button className="auth-switch" onClick={() => window.location.assign('/')}>Back to StudyOS</button>
      </>}
    </section>
  </main>
}
