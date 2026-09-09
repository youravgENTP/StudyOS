import { setCaffeineAxisFontSize, useCaffeineAxisFontSize } from './preferences'
import './settings.css'

export function SettingsPage() {
  const axisFontSize = useCaffeineAxisFontSize()
  return <div className="page settings-page">
    <div className="eyebrow">Preferences</div>
    <h1 className="page-title">Settings</h1>
    <section className="card settings-section">
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
