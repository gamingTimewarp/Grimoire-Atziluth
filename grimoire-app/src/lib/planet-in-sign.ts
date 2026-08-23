/**
 * planet-in-sign.ts
 * Loads the Planet-in-Sign guide from the bundled grimoire-data virtual module.
 * Each entry pairs a planet/point canonical name with a zodiac sign canonical
 * name and a short interpretive blurb.
 */
import rawData from 'virtual:grimoire-data'

export interface PlanetInSignCombo {
  planet: string
  sign: string
  meaning: string
}

const file = (rawData as Record<string, unknown>)['planet-in-sign.json'] as
  | { combinations: PlanetInSignCombo[] }
  | undefined

export const PLANET_IN_SIGN_COMBOS: PlanetInSignCombo[] = file?.combinations ?? []

export function getPlanetInSignMeaning(planetCn: string, signCn: string): string | null {
  return PLANET_IN_SIGN_COMBOS.find(c => c.planet === planetCn && c.sign === signCn)?.meaning ?? null
}
