/**
 * numerology-store.ts
 * localStorage persistence for the Numerology page's inputs and selections, so
 * navigating away and back (or restarting the app) doesn't lose what was entered.
 */

export type NumerologyTab = 'name' | 'date' | 'combined'
export type NumerologySystem = 'pythagorean' | 'chaldean'

export interface NumerologyState {
  tab: NumerologyTab
  system: NumerologySystem
  name: string
  date: string
}

const KEY = 'grimoire:numerology'

const DEFAULTS: NumerologyState = {
  tab: 'name',
  system: 'pythagorean',
  name: '',
  date: '',
}

export function loadNumerologyState(): NumerologyState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveNumerologyState(state: NumerologyState): void {
  localStorage.setItem(KEY, JSON.stringify(state))
}
