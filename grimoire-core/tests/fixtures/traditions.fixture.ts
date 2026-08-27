import type { CreateTraditionInput } from '../../src/types/tradition.types.js'
import { TraditionId } from '../../src/constants/tradition-ids.js'

export const goldenDawnTradition: CreateTraditionInput = {
  canonicalName: TraditionId.GOLDEN_DAWN,
  displayName: 'Golden Dawn',
  description: 'Standard Western Hermetic tarot attributions as defined by the Hermetic Order of the Golden Dawn.',
  isBuiltIn: true,
  attributionFields: [
    {
      linkLabel: 'attributed-planet',
      displayName: 'Attributed Planet',
      targetEntityType: 'astrology.planet',
      allowMultiple: false,
      sortOrder: 0,
    },
    {
      linkLabel: 'attributed-sign',
      displayName: 'Attributed Sign',
      targetEntityType: 'astrology.sign',
      allowMultiple: false,
      sortOrder: 1,
    },
    {
      linkLabel: 'attributed-element',
      displayName: 'Attributed Element',
      targetEntityType: 'astrology.element',
      allowMultiple: false,
      sortOrder: 2,
    },
    {
      linkLabel: 'attributed-letter',
      displayName: 'Hebrew Letter',
      targetEntityType: 'letter.hebrew',
      allowMultiple: false,
      sortOrder: 3,
    },
    {
      linkLabel: 'attributed-path',
      displayName: 'Attributed Path',
      targetEntityType: 'qabalah.path',
      allowMultiple: false,
      sortOrder: 4,
    },
  ],
}

export const thothTradition: CreateTraditionInput = {
  canonicalName: TraditionId.THOTH_CROWLEY,
  displayName: 'Thoth / Crowley',
  description: "Aleister Crowley's variant attributions for the Thoth Tarot deck.",
  isBuiltIn: true,
  attributionFields: [
    {
      linkLabel: 'attributed-planet',
      displayName: 'Attributed Planet',
      targetEntityType: 'astrology.planet',
      allowMultiple: false,
      sortOrder: 0,
    },
    {
      linkLabel: 'attributed-sign',
      displayName: 'Attributed Sign',
      targetEntityType: 'astrology.sign',
      allowMultiple: false,
      sortOrder: 1,
    },
    {
      linkLabel: 'attributed-element',
      displayName: 'Attributed Element',
      targetEntityType: 'astrology.element',
      allowMultiple: false,
      sortOrder: 2,
    },
    {
      linkLabel: 'attributed-letter',
      displayName: 'Hebrew Letter',
      targetEntityType: 'letter.hebrew',
      allowMultiple: false,
      sortOrder: 3,
    },
  ],
}
