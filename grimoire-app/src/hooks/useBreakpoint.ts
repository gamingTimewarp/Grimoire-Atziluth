import { useState, useEffect } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/** Returns the current responsive breakpoint, re-evaluating on window resize. */
export function useBreakpoint(): Breakpoint {
  const [width, setWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    const handler = () => setWidth(window.innerWidth)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  if (width <= 680) return 'mobile'
  if (width <= 900) return 'tablet'
  return 'desktop'
}
