import React, { useState, useRef } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { exportAllData, validateImportData } from '../utils/storage.js'
import { ASSESSMENT_START } from '../utils/dates.js'

export default function Settings() {
  const { profile, settings, updateSettings, importData, resetAll } = useApp()
  const [name, setName] = useState(settings.name || profile?.name || '')
  const [showReset, setShowReset] = useState(false)
  const [saved, setSaved] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const fileRef = useRef(null)

  function handleSave(e) {
    e.preventDefault()
    updateSettings({ name: name.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleExport() {
    const data = exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yr8-revision-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportText() {
    setImportError('')
    setImportSuccess(false)
    let parsed
    try {
      parsed = JSON.parse(importText)
    } catch {
      setImportError('Could not parse JSON. Make sure you pasted the full exported file.')
      return
    }
    const err = validateImportData(parsed)
    if (err) { setImportError(err); return }
    importData(parsed)
    setImportSuccess(true)
    setImportText('')
  }

  function handleFileImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportError('')
      setImportSuccess(false)
      let parsed
      try {
        parsed = JSON.parse(ev.target.result)
      } catch {
        setImportError('Could not read file. Make sure it is a valid JSON export.')
        return
      }
      const err = validateImportData(parsed)
      if (err) { setImportError(err); return }
      importData(parsed)
      setImportSuccess(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleReset() {
    resetAll()
    setShowReset(false)
  }

  return (
    <div className="screen">

      <section className="card">
        <h3 className="card__title">Profile</h3>
        <form onSubmit={handleSave}>
          <label className="form-label" htmlFor="settings-name">Name</label>
          <input
            id="settings-name"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="btn btn--primary mt-2">
            {saved ? '✓ Saved' : 'Save'}
          </button>
        </form>
      </section>

      <section className="card">
        <h3 className="card__title">Assessment dates</h3>
        <p className="settings-info">
          <strong>Assessment week:</strong> Tuesday 26 May – Tuesday 2 June 2026
        </p>
      </section>

      <section className="card">
        <h3 className="card__title">Export data</h3>
        <p className="muted-text mb-2">
          Download a JSON file with all your progress, sessions and settings.
          Includes <code>appName</code> and <code>exportedAt</code> for re-import.
        </p>
        <button className="btn btn--secondary btn--full" onClick={handleExport}>
          Export my data (JSON)
        </button>
      </section>

      <section className="card">
        <h3 className="card__title">Import data</h3>
        <p className="muted-text mb-2">
          Restore from a previously exported JSON file. This will replace all current data.
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileImport}
        />
        <button
          className="btn btn--secondary btn--full mb-2"
          onClick={() => fileRef.current?.click()}
        >
          Choose file to import…
        </button>

        <label className="form-label">Or paste JSON directly</label>
        <textarea
          className="form-textarea"
          rows={4}
          placeholder='{ "appName": "Year 8 Revision Coach", ... }'
          value={importText}
          onChange={(e) => { setImportText(e.target.value); setImportError(''); setImportSuccess(false) }}
        />
        {importError && <p className="form-error">{importError}</p>}
        {importSuccess && <p className="form-success">✓ Data imported successfully.</p>}
        <button
          className="btn btn--primary mt-2"
          disabled={!importText.trim()}
          onClick={handleImportText}
        >
          Import from text
        </button>
      </section>

      <section className="card">
        <h3 className="card__title">Reset data</h3>
        <p className="muted-text mb-2">
          Permanently delete all progress and sessions. Cannot be undone.
        </p>
        {!showReset ? (
          <button className="btn btn--ghost btn--full" onClick={() => setShowReset(true)}>
            Reset all data…
          </button>
        ) : (
          <div className="reset-confirm">
            <p className="reset-confirm__text">
              This will delete all progress, sessions and rewards. Are you sure?
            </p>
            <div className="reset-confirm__actions">
              <button className="btn btn--danger" onClick={handleReset}>Yes, reset everything</button>
              <button className="btn btn--ghost" onClick={() => setShowReset(false)}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="card__title">About</h3>
        <p className="muted-text">
          Year 8 Revision Coach · Summer {ASSESSMENT_START.getFullYear()}
          <br />
          All progress is stored on this device only. No account required.
        </p>
      </section>

    </div>
  )
}
