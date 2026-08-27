import type { CreateLinkInput } from '../../src/types/link.types.js'
import { TraditionId } from '../../src/constants/tradition-ids.js'

/** GD attribution: The Fool → Aleph (Hebrew letter) */
export const foolToAleph: CreateLinkInput = {
  sourceCanonicalName: 'tarot.major.the-fool',
  targetCanonicalName: 'letter.hebrew.aleph',
  label: 'attributed-letter',
  bidirectional: false,
  traditionScope: [TraditionId.GOLDEN_DAWN, TraditionId.THOTH_CROWLEY],
  isBuiltIn: true,
  extendedData: {},
}

/** Universal: The Fool corresponds-to Kether (no tradition required) */
export const foolToKether: CreateLinkInput = {
  sourceCanonicalName: 'tarot.major.the-fool',
  targetCanonicalName: 'qabalah.sephira.kether',
  label: 'corresponds-to',
  bidirectional: true,
  traditionScope: [],  // universal
  isBuiltIn: true,
  extendedData: {},
}

/** GD only: The Fool → Air (element) — Thoth says Spirit, so different scope */
export const foolToAirGD: CreateLinkInput = {
  sourceCanonicalName: 'tarot.major.the-fool',
  targetCanonicalName: 'astrology.element.air',
  label: 'attributed-element',
  bidirectional: false,
  traditionScope: [TraditionId.GOLDEN_DAWN],
  isBuiltIn: true,
  extendedData: {},
}
