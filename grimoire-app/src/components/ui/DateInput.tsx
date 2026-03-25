import React, { useState, useEffect, useRef } from 'react'

const DAY_LABELS  = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function toDateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function parseDate(value: string): Date | null {
  if (!value) return null
  const d = new Date(value + 'T12:00:00')
  return isNaN(d.getTime()) ? null : d
}

/**
 * Custom date-picker that replaces <input type="date">.
 * Using the native input in Tauri's WebView causes the calendar popup to
 * ignore outside clicks (it can only be dismissed with Escape).  This
 * component renders its own calendar dropdown and closes it via
 * document.addEventListener('mousedown'), which always fires.
 */
export function DateInput({
  value,
  onChange,
  style,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  style?: React.CSSProperties
  disabled?: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [open, setOpen]         = useState(false)
  const selected                = parseDate(value)
  const today                   = new Date()

  const [viewYear,  setViewYear]  = useState(selected?.getFullYear()  ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.getMonth()     ?? today.getMonth())
  const [yearInput, setYearInput] = useState(String(selected?.getFullYear() ?? today.getFullYear()))

  // Sync view when value changes externally
  useEffect(() => {
    const d = parseDate(value)
    if (d) {
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
      setYearInput(String(d.getFullYear()))
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => { setYearInput(String(y - 1)); return y - 1 }) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => { setYearInput(String(y + 1)); return y + 1 }) }
    else setViewMonth(m => m + 1)
  }

  const handleYearInput = (raw: string) => {
    setYearInput(raw)
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n > 0 && n < 9999) setViewYear(n)
  }

  const handleMonthSelect = (m: number) => {
    setViewMonth(m)
  }

  const selectDay = (day: number, offset: -1 | 0 | 1) => {
    let m = viewMonth + offset
    let y = viewYear
    if (m < 0)  { m = 11; y-- }
    if (m > 11) { m = 0;  y++ }
    onChange(toDateStr(y, m, day))
    setOpen(false)
  }

  const selectToday = () => {
    onChange(toDateStr(today.getFullYear(), today.getMonth(), today.getDate()))
    setOpen(false)
  }

  // Build 6-row grid (42 cells)
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrev   = new Date(viewYear, viewMonth,     0).getDate()

  type Cell = { day: number; offset: -1 | 0 | 1 }
  const cells: Cell[] = []
  for (let i = 0; i < firstWeekday; i++)
    cells.push({ day: daysInPrev - firstWeekday + 1 + i, offset: -1 })
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, offset: 0 })
  while (cells.length < 42)
    cells.push({ day: cells.length - firstWeekday - daysInMonth + 1, offset: 1 })

  const isSel = (day: number, offset: -1 | 0 | 1) => {
    if (!selected || offset !== 0) return false
    return selected.getFullYear() === viewYear &&
           selected.getMonth()    === viewMonth &&
           selected.getDate()     === day
  }
  const isTdy = (day: number, offset: -1 | 0 | 1) =>
    offset === 0 &&
    today.getFullYear() === viewYear &&
    today.getMonth()    === viewMonth &&
    today.getDate()     === day

  const displayValue = selected
    ? selected.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : ''

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'block', width: '100%' }}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={(() => {
          // colorScheme is only meaningful on native form elements; strip it for <button>
          const { colorScheme: _cs, ...rest } = (style ?? {}) as React.CSSProperties & { colorScheme?: string }
          return {
            display: 'block', width: '100%', textAlign: 'left',
            cursor: disabled ? 'default' : 'pointer',
            boxSizing: 'border-box', fontFamily: 'inherit',
            ...rest,
          }
        })()}
      >
        {displayValue || <span style={{ opacity: 0.4 }}>Select date</span>}
      </button>

      {/* Calendar popup */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 2000,
          background: 'var(--color-surface-2)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          minWidth: '252px',
          userSelect: 'none',
        }}>
          {/* Month / Year header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <button type="button" onClick={prevMonth} style={NAV_BTN}>‹</button>
            <select
              value={viewMonth}
              onChange={e => handleMonthSelect(Number(e.target.value))}
              style={SELECT_STYLE}
            >
              {MONTH_NAMES.map((n, i) => <option key={i} value={i}>{n}</option>)}
            </select>
            <input
              type="text"
              value={yearInput}
              onChange={e => handleYearInput(e.target.value)}
              style={YEAR_INPUT_STYLE}
            />
            <button type="button" onClick={nextMonth} style={NAV_BTN}>›</button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: 'var(--color-text-subtle)', padding: '2px 0', fontWeight: 600, letterSpacing: '0.04em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {cells.map((cell, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectDay(cell.day, cell.offset)}
                style={{
                  padding: '5px 0',
                  textAlign: 'center',
                  fontSize: '12px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: isSel(cell.day, cell.offset) ? 'var(--color-accent)' : 'transparent',
                  color: isSel(cell.day, cell.offset)
                    ? 'var(--color-bg)'
                    : cell.offset !== 0
                    ? 'var(--color-text-subtle)'
                    : isTdy(cell.day, cell.offset)
                    ? 'var(--color-accent)'
                    : 'var(--color-text)',
                  fontWeight: isSel(cell.day, cell.offset) || isTdy(cell.day, cell.offset) ? 600 : 400,
                  opacity: cell.offset !== 0 ? 0.45 : 1,
                }}
              >
                {cell.day}
              </button>
            ))}
          </div>

          {/* Today shortcut */}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border)', textAlign: 'center' }}>
            <button
              type="button"
              onClick={selectToday}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--color-text-subtle)', fontFamily: 'inherit' }}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const NAV_BTN: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '16px', color: 'var(--color-text-muted)',
  padding: '0 4px', lineHeight: 1, fontFamily: 'inherit',
  flexShrink: 0,
}

const SELECT_STYLE: React.CSSProperties = {
  flex: 1, background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
  borderRadius: '4px', color: 'var(--color-text)', fontSize: '12px',
  padding: '3px 4px', cursor: 'pointer', fontFamily: 'inherit',
  colorScheme: 'dark',
}

const YEAR_INPUT_STYLE: React.CSSProperties = {
  width: '52px', background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
  borderRadius: '4px', color: 'var(--color-text)', fontSize: '12px',
  padding: '3px 6px', fontFamily: 'inherit', outline: 'none',
  colorScheme: 'dark', flexShrink: 0,
}

// ─── DateTimeInput ────────────────────────────────────────────────────────────

/**
 * Combined date + time picker for datetime-local values (YYYY-MM-DDTHH:MM).
 * Uses the custom DateInput for the date portion; the time portion is a plain
 * text input (HH:MM) to avoid native time-picker popup issues.
 */
export function DateTimeInput({
  value,
  onChange,
  style,
}: {
  value: string
  onChange: (v: string) => void
  style?: React.CSSProperties
}) {
  const datePart = value ? value.slice(0, 10) : ''
  const timePart = value ? (value.slice(11, 16) || '00:00') : ''

  const [timeInput, setTimeInput] = useState(timePart)

  // Sync time input when value changes externally
  useEffect(() => {
    setTimeInput(value ? (value.slice(11, 16) || '00:00') : '')
  }, [value])

  const handleDateChange = (date: string) => {
    if (!date) { onChange(''); return }
    const t = timeInput || '00:00'
    onChange(`${date}T${t}`)
  }

  const handleTimeChange = (raw: string) => {
    setTimeInput(raw)
    if (/^\d{2}:\d{2}$/.test(raw) && datePart) {
      onChange(`${datePart}T${raw}`)
    }
  }

  const timeStyle: React.CSSProperties = {
    ...(style ?? {}),
    width: '90px',
    flexShrink: 0,
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <DateInput value={datePart} onChange={handleDateChange} style={style} />
      <input
        type="text"
        value={timeInput}
        onChange={e => handleTimeChange(e.target.value)}
        placeholder="HH:MM"
        maxLength={5}
        style={timeStyle}
      />
    </div>
  )
}
