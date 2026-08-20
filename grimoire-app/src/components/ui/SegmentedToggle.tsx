/**
 * SegmentedToggle.tsx
 * Small connected button-row toggle (ABC/Topic, Degree/Planet/Aspect, etc.) —
 * the same look used for the entity-page traditional/alpha sort toggle and the
 * Reference Browse grid's alpha/topic toggle, pulled out once a third caller
 * (the Aspects modal's sort modes) needed the identical pattern.
 */

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  title?: string
}

export function SegmentedToggle<T extends string>({ value, options, onChange }: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex' }}>
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          title={opt.title}
          style={{
            padding: '2px 8px',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 600,
            cursor: 'pointer',
            border: '1px solid',
            borderColor: value === opt.value ? 'var(--color-accent-muted)' : 'var(--color-border)',
            background: value === opt.value ? 'var(--color-surface-3)' : 'var(--color-surface-2)',
            color: value === opt.value ? 'var(--color-accent)' : 'var(--color-text-subtle)',
            borderRadius: i === 0 ? '4px 0 0 4px' : i === options.length - 1 ? '0 4px 4px 0' : '0',
            lineHeight: '1.6',
            letterSpacing: '0.02em',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
