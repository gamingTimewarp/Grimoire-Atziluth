import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, object> = {
  primary: {
    background: 'var(--color-accent)',
    color: 'var(--color-accent-contrast)',
    border: 'none',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-muted)',
    border: '1px solid var(--color-border)',
  },
  danger: {
    background: 'transparent',
    color: 'var(--color-danger)',
    border: '1px solid var(--color-danger)',
  },
}

const sizeStyles: Record<NonNullable<ButtonProps['size']>, object> = {
  sm: { padding: '6px 12px', fontSize: '13px', borderRadius: '4px' },
  md: { padding: '10px 20px', fontSize: '14px', borderRadius: '6px' },
  lg: { padding: '14px 28px', fontSize: '16px', borderRadius: '8px' },
}

export function Button({ variant = 'primary', size = 'md', children, style, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontWeight: 500,
        transition: 'opacity 0.15s, filter 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        ...style,
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget.style.filter = 'brightness(1.1)') }}
      onMouseLeave={e => { (e.currentTarget.style.filter = '') }}
    >
      {children}
    </button>
  )
}
