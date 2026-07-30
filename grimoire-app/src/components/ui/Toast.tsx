/**
 * Toast.tsx
 * A small fixed-position, bottom-centred message. Purely presentational —
 * the caller owns visibility (render conditionally) and auto-dismiss timing.
 */

export function Toast({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000,
      }}
    >
      <div style={{
        padding: '10px 18px',
        background: 'var(--color-surface-3)', border: '1px solid var(--color-border)',
        borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        fontSize: '13px', color: 'var(--color-text)',
      }}>
        {message}
      </div>
    </div>
  )
}
