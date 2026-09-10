import { setBedtime, setCaffeineAxisFontSize, setCaffeineHalfLifeHours, useBedtime, useCaffeineAxisFontSize, useCaffeineHalfLifeHours } from './preferences'
import './settings.css'

export function SettingsPage() {
  const axisFontSize = useCaffeineAxisFontSize()
  const bedtime = useBedtime()
  const halfLifeHours = useCaffeineHalfLifeHours()
  return <div className="page settings-page">
    <div className="eyebrow">Preferences</div>
    <h1 className="page-title">Settings</h1>
    <section className="card settings-section">
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
