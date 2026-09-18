import { useState, type FormEvent } from 'react'
import type { WeekStart } from '../calendar/date'
import { TimetableImportCard } from '../timetable/TimetableImportCard'
import { requestPasswordReset, updateProfile } from '../../lib/neon/auth'
import { useAuth } from '../../providers/auth-context'
import { setBedtime, setBedtimeResidualTargetMg, setCaffeineAxisFontSize, setCaffeineHalfLifeHours, setWeekStartsOn, useBedtime, useBedtimeResidualTargetMg, useCaffeineAxisFontSize, useCaffeineHalfLifeHours, useWeekStartsOn } from './preferences'
import './settings.css'
import './settings-calendar.css'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function SettingsPage() {
  const session = useAuth()
  const user = session.data?.user
  const [name, setName] = useState(user?.name ?? '')
  const [profilePending, setProfilePending] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [resetPending, setResetPending] = useState(false)
  const [resetMessage, setResetMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const axisFontSize = useCaffeineAxisFontSize()
  const bedtime = useBedtime()
  const halfLifeHours = useCaffeineHalfLifeHours()
  const bedtimeResidualTargetMg = useBedtimeResidualTargetMg()
  const weekStartsOn = useWeekStartsOn()

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName) return
    setProfilePending(true)
    setProfileMessage(null)
    try {
      await updateProfile(nextName)
      await session.refetch?.()
      setProfileMessage({ tone: 'success', text: 'Profile updated.' })
    } catch (caught) {
      setProfileMessage({ tone: 'error', text: errorMessage(caught) })
    } finally {
      setProfilePending(false)
    }
  }

  async function sendResetLink() {
    if (!user?.email) return
    setResetPending(true)
    setResetMessage(null)
    try {
      await requestPasswordReset(user.email, `${window.location.origin}/reset-password`)
      setResetMessage({ tone: 'success', text: `Reset link sent to ${user.email}.` })
    } catch (caught) {
      setResetMessage({ tone: 'error', text: errorMessage(caught) })
    } finally {
      setResetPending(false)
    }
  }

  return <div className="page settings-page">
    <div className="eyebrow">Preferences</div>
    <h1 className="page-title">Settings</h1>
    <section className="card account-settings-card">
      <div className="settings-section-heading"><div><div className="eyebrow">Account</div><h2>Personal information</h2><p>Manage the profile connected to this StudyOS workspace.</p></div></div>
      <form className="account-profile-form" onSubmit={saveProfile}>
        <label className="account-field"><span>Display name</span><input value={name} onChange={event => setName(event.target.value)} autoComplete="name" required /></label>
        <label className="account-field"><span>Email</span><input value={user?.email ?? ''} type="email" readOnly aria-readonly="true" /><small>This is the email currently connected to your account.</small></label>
        {profileMessage && <p className={`settings-message ${profileMessage.tone}`} role="status">{profileMessage.text}</p>}
        <div className="account-actions"><button className="button primary" disabled={profilePending || !name.trim() || name.trim() === (user?.name ?? '')}>{profilePending ? 'Saving…' : 'Save profile'}</button></div>
      </form>
      <hr />
      <div className="account-security-row">
        <div><h3>Password</h3><p>We will email a secure, one-time reset link to the address above. Your current password is not required.</p></div>
        <button className="button" type="button" onClick={sendResetLink} disabled={resetPending || !user?.email}>{resetPending ? 'Sending…' : 'Send reset link'}</button>
      </div>
      {resetMessage && <p className={`settings-message ${resetMessage.tone}`} role="status">{resetMessage.text}</p>}
    </section>
    <TimetableImportCard />
    <section className="card settings-section">
      <div><h2>Calendar</h2><p>Choose which day appears first in every Calendar week.</p></div>
      <label className="value-setting">
        <span>Week starts on</span>
        <select value={weekStartsOn} onChange={event => setWeekStartsOn(Number(event.target.value) as WeekStart)}><option value={1}>Monday</option><option value={0}>Sunday</option></select>
        <small>Updates the Calendar immediately on this device.</small>
      </label>
      <hr />
      <div><h2>Sleep & caffeine</h2><p>Used for residual estimates and the recommended caffeine cutoff.</p></div>
      <label className="value-setting">
        <span>Regular bedtime</span>
        <input type="time" value={bedtime} onChange={event => setBedtime(event.target.value)} />
        <small>{bedtime ? 'Clear the field to disable cutoff guidance.' : 'Not set'}</small>
      </label>
      <label className="value-setting">
        <span>Caffeine half-life</span>
        <input type="number" min="2" max="10" step="0.5" value={halfLifeHours} onChange={event => setCaffeineHalfLifeHours(Number(event.target.value))} />
        <small>hours · estimated range 2–10</small>
      </label>
      <label className="value-setting">
        <span>Bedtime residual target</span>
        <input type="number" min="20" max="60" step="1" value={bedtimeResidualTargetMg} onChange={event => setBedtimeResidualTargetMg(Number(event.target.value))} />
        <small>mg · Planning target for estimated remaining caffeine at bedtime, not a proven sleep-safety threshold.</small>
      </label>
      <hr />
      <div><h2>Caffeine chart</h2><p>Adjust the time and milligram labels on both axes.</p></div>
      <label className="font-size-setting">
        <span>Axis label size</span>
        <input type="range" min="12" max="20" step="1" value={axisFontSize} onChange={event => setCaffeineAxisFontSize(Number(event.target.value))} />
        <output>{axisFontSize}px</output>
      </label>
      <button className="text-button" onClick={() => setCaffeineAxisFontSize(14)}>Reset to 14px</button>
    </section>
  </div>
}
