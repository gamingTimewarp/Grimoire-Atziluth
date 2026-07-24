import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Download, Upload, CheckCircle, AlertCircle, Clock, Archive, ArrowLeft, FolderOpen } from 'lucide-react'
import { exportBackup, pickAndImportBackup } from '@/lib/export-import'
import type { ImportResult } from '@/lib/export-import'
import { countOlderThan, archiveOlderThan } from '@/lib/reading-db'
import { Button } from '@/components/ui/Button'
import { useEngineStore } from '@/stores/engine'
import { seedCustomIntoEngine } from '@/lib/custom-db'
import { appConfigDir } from '@tauri-apps/api/path'
import { openPath } from '@tauri-apps/plugin-opener'

export const Route = createFileRoute('/settings/data')({
  component: DataSettingsPage,
})

function lastBackupLabel(): string | null {
  const raw = localStorage.getItem('grimoire:last-backup')
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) return null
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

type Status =
  | { kind: 'idle' }
  | { kind: 'exporting' }
  | { kind: 'importing' }
  | { kind: 'done'; result: ImportResult; savedPath?: string }
  | { kind: 'error'; message: string }

function DataSettingsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const lastBackup = lastBackupLabel()
  const { engine } = useEngineStore()

  const handleExport = async () => {
    setStatus({ kind: 'exporting' })
    try {
      const path = await exportBackup()
      if (path === null) {
        setStatus({ kind: 'idle' })  // user cancelled the save dialog
      } else {
        setStatus({ kind: 'done', result: { customEntities: 0, customLinks: 0, natalCharts: 0, readings: 0, journalEntries: 0, journalEntityLinks: 0 }, savedPath: path })
      }
    } catch (err) {
      setStatus({ kind: 'error', message: String(err) })
    }
  }

  const handleImport = async () => {
    setStatus({ kind: 'importing' })
    try {
      const result = await pickAndImportBackup()
      if (result === null) {
        setStatus({ kind: 'idle' })  // user cancelled the open dialog
        return
      }
      if (engine) await seedCustomIntoEngine(engine.adapter)
      setStatus({ kind: 'done', result })
    } catch (err) {
      setStatus({ kind: 'error', message: String(err) })
    }
  }

  const isExportDone = status.kind === 'done' && status.savedPath !== undefined

  const [fileLocationError, setFileLocationError] = useState<string | null>(null)
  const handleOpenFileLocation = async () => {
    setFileLocationError(null)
    try {
      const dir = await appConfigDir()
      await openPath(dir)
    } catch (err) {
      setFileLocationError(err instanceof Error ? err.message : 'Failed to open the folder.')
    }
  }

  return (
    <div style={{ maxWidth: '480px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: '/settings' })}>
          <ArrowLeft size={13} /> Settings
        </Button>
        <h1 style={{ fontSize: '22px', fontWeight: 300, margin: 0 }}>Data</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 500, margin: 0 }}>Data Backup &amp; Restore</h2>
        {lastBackup ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-text-subtle)' }}>
            <Clock size={11} /> Last backup: {lastBackup}
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
            <Clock size={11} /> No backup on record
          </span>
        )}
      </div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '28px', marginTop: 0 }}>
        Export a complete backup of your personal data — custom entities, readings, journal
        entries, natal charts, and preferences — as a single JSON file. Use Import to merge
        a backup into the current app.
      </p>

      {/* Open file location */}
      <section style={{ marginBottom: '20px', padding: '18px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <FolderOpen size={15} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>App Data Folder</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
          Opens the folder containing <code style={{ fontFamily: 'monospace', fontSize: '11px' }}>grimoire.db</code> and
          the <code style={{ fontFamily: 'monospace', fontSize: '11px' }}>custom-art</code> subfolder where custom
          entity images are stored — useful for manually replacing art or editing the database directly.
        </p>
        <Button variant="ghost" onClick={handleOpenFileLocation}>
          <FolderOpen size={14} /> Open File Location
        </Button>
        {fileLocationError && (
          <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-danger)', fontFamily: 'monospace' }}>{fileLocationError}</div>
        )}
      </section>

      {/* Export */}
      <section style={{ marginBottom: '20px', padding: '18px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Download size={15} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Export</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
          Opens a Save dialog to choose where to write the backup. The containing folder
          is revealed in your file manager afterwards. Study (SRS) progress is not included.
        </p>
        <Button onClick={handleExport} disabled={status.kind === 'exporting'}>
          <Download size={14} />
          {status.kind === 'exporting' ? 'Exporting…' : 'Export Backup…'}
        </Button>
      </section>

      {/* Import */}
      <section style={{ padding: '18px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Upload size={15} style={{ color: 'var(--color-accent)' }} />
          <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Import</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
          Opens a file picker to select a <code style={{ fontFamily: 'monospace', fontSize: '11px' }}>.json</code> backup.
          Merges into the current app — existing records (same ID or canonical name)
          are preserved. Settings and preferences are overwritten by the backup values.
          The app will use the restored settings after the next navigation.
        </p>
        <Button
          variant="ghost"
          onClick={handleImport}
          disabled={status.kind === 'importing'}
        >
          <Upload size={14} />
          {status.kind === 'importing' ? 'Importing…' : 'Import Backup…'}
        </Button>
      </section>

      {/* Status */}
      {isExportDone && (
        <div style={{ marginTop: '20px', padding: '14px 18px', background: 'rgba(80,160,80,0.1)', border: '1px solid rgba(80,160,80,0.35)', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <CheckCircle size={16} style={{ color: '#5ca05c', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '4px' }}>Backup saved</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {(status as { savedPath: string }).savedPath}
            </div>
          </div>
        </div>
      )}

      {status.kind === 'done' && !isExportDone && (
        <div style={{ marginTop: '20px', padding: '14px 18px', background: 'rgba(80,160,80,0.1)', border: '1px solid rgba(80,160,80,0.35)', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <CheckCircle size={16} style={{ color: '#5ca05c', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '6px' }}>Import complete</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {([
                ['Custom entities', status.result.customEntities],
                ['Custom links',    status.result.customLinks],
                ['Natal charts',    status.result.natalCharts],
                ['Readings',        status.result.readings],
                ['Journal entries', status.result.journalEntries],
                ['Entity links',    status.result.journalEntityLinks],
              ] as [string, number][]).map(([label, count]) => (
                <span key={label}>{label}: {count}</span>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginTop: '8px' }}>
              Custom entities are available immediately. Navigate to another page to see other restored data.
            </div>
          </div>
        </div>
      )}

      {status.kind === 'error' && (
        <div style={{ marginTop: '20px', padding: '14px 18px', background: 'rgba(160,60,60,0.1)', border: '1px solid rgba(160,60,60,0.35)', borderRadius: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <AlertCircle size={16} style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '1px' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)', marginBottom: '4px' }}>Failed</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{status.message}</div>
          </div>
        </div>
      )}

      <ArchiveSection />
    </div>
  )
}

// ─── Archive section ──────────────────────────────────────────────────────────

function ArchiveSection() {
  const [years,   setYears]   = useState(2)
  const [preview, setPreview] = useState<{ readings: number; journalEntries: number } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [result,  setResult]  = useState<{ readings: number; journalEntries: number } | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  const cutoff = () => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - years)
    return d
  }

  const handlePreview = async () => {
    setError(null)
    setResult(null)
    try {
      const counts = await countOlderThan(cutoff())
      setPreview(counts)
      setConfirm(counts.readings > 0 || counts.journalEntries > 0)
    } catch (e) {
      setError(String(e))
    }
  }

  const handleArchive = async () => {
    setError(null)
    try {
      const counts = await archiveOlderThan(cutoff())
      setResult(counts)
      setPreview(null)
      setConfirm(false)
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <section style={{ marginTop: '20px', padding: '18px 20px', background: 'var(--color-surface-2)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <Archive size={15} style={{ color: 'var(--color-text-muted)' }} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}>Archive Old Records</span>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 14px' }}>
        Permanently delete readings and journal entries older than a chosen number of years.
        Export a backup first if you want to preserve this data.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <label htmlFor="archive-years" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          Delete records older than
        </label>
        <input
          id="archive-years"
          type="number"
          min={1}
          max={50}
          value={years}
          onChange={e => { setYears(Math.max(1, Number(e.target.value))); setPreview(null); setConfirm(false); setResult(null) }}
          style={{ width: '56px', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface-1)', color: 'var(--color-text)', fontSize: '13px', fontFamily: 'inherit' }}
        />
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>year{years !== 1 ? 's' : ''}</span>
        <Button variant="ghost" size="sm" onClick={handlePreview}>Preview</Button>
      </div>

      {preview && (preview.readings > 0 || preview.journalEntries > 0) && (
        <div style={{ padding: '10px 14px', background: 'rgba(160,60,60,0.07)', border: '1px solid rgba(160,60,60,0.25)', borderRadius: '6px', marginBottom: '10px' }}>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
            {preview.readings} reading{preview.readings !== 1 ? 's' : ''} and {preview.journalEntries} journal entr{preview.journalEntries !== 1 ? 'ies' : 'y'} would be permanently deleted.
          </div>
          {confirm && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Button size="sm" onClick={handleArchive} style={{ borderColor: 'rgba(160,60,60,0.5)', color: 'var(--color-danger)' }}>
                Delete permanently
              </Button>
              <button onClick={() => { setConfirm(false); setPreview(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--color-text-muted)', padding: '2px 6px' }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {preview && preview.readings === 0 && preview.journalEntries === 0 && (
        <div style={{ fontSize: '12px', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
          No records found older than {years} year{years !== 1 ? 's' : ''}.
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
          <CheckCircle size={14} style={{ color: '#5ca05c' }} />
          Deleted {result.readings} reading{result.readings !== 1 ? 's' : ''} and {result.journalEntries} journal entr{result.journalEntries !== 1 ? 'ies' : 'y'}.
        </div>
      )}

      {error && (
        <div style={{ fontSize: '12px', color: 'var(--color-danger)', fontFamily: 'monospace' }}>{error}</div>
      )}
    </section>
  )
}
