/**
 * gematria-store.ts
 * localStorage persistence for the Gematria page's input and toggles, so
 * navigating away and back (or restarting the app) doesn't lose what was typed.
 */

export type GematriaDisplayMode = 'character' | 'name'

export interface GematriaState {
  input: string
  useFinalValues: boolean
  displayMode: GematriaDisplayMode
}

const KEY = 'grimoire:gematria'

const DEFAULTS: GematriaState = {
  input: '',
  useFinalValues: false,
  displayMode: 'character',
}

export function loadGematriaState(): GematriaState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveGematriaState(state: GematriaState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}
