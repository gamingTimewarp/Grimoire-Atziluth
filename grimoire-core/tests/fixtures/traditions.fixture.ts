import type { CreateTraditionInput } from '../../src/types/tradition.types.js'
import { TraditionId } from '../../src/constants/tradition-ids.js'
import { LinkLabel } from '../../src/constants/link-labels.js'
import { EntityType } from '../../src/constants/entity-types.js'

export const goldenDawnTradition: CreateTraditionInput = {
  canonicalName: TraditionId.GOLDEN_DAWN,
  displayName: 'Golden Dawn',
  description: 'Standard Western Hermetic tarot attributions as defined by the Hermetic Order of the Golden Dawn.',
  isBuiltIn: true,
  attributionFields: [
    {
      linkLabel: LinkLabel.ATTRIBUTED_PLANET,
      displayName: 'Attributed Planet',
      targetEntityType: EntityType.PLANET,
      allowMultiple: false,
      sortOrder: 0,
    },
    {
      linkLabel: LinkLabel.ATTRIBUTED_SIGN,
      displayName: 'Attributed Sign',
      targetEntityType: EntityType.ZODIAC_SIGN,
      allowMultiple: false,
      sortOrder: 1,
    },
    {
      linkLabel: LinkLabel.ATTRIBUTED_ELEMENT,
      displayName: 'Attributed Element',
      targetEntityType: EntityType.ELEMENT,
      allowMultiple: false,
      sortOrder: 2,
    },
    {
      linkLabel: LinkLabel.ATTRIBUTED_LETTER,
      displayName: 'Hebrew Letter',
      targetEntityType: EntityType.HEBREW_LETTER,
      allowMultiple: false,
      sortOrder: 3,
    },
    {
      linkLabel: LinkLabel.ATTRIBUTED_PATH,
      displayName: 'Attributed Path',
      targetEntityType: EntityType.PATH,
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
      linkLabel: LinkLabel.ATTRIBUTED_PLANET,
      displayName: 'Attributed Planet',
      targetEntityType: EntityType.PLANET,
      allowMultiple: false,
      sortOrder: 0,
    },
    {
      linkLabel: LinkLabel.ATTRIBUTED_SIGN,
      displayName: 'Attributed Sign',
      targetEntityType: EntityType.ZODIAC_SIGN,
      allowMultiple: false,
      sortOrder: 1,
    },
    {
      linkLabel: LinkLabel.ATTRIBUTED_ELEMENT,
      displayName: 'Attributed Element',
      targetEntityType: EntityType.ELEMENT,
      allowMultiple: false,
      sortOrder: 2,
    },
    {
      linkLabel: LinkLabel.ATTRIBUTED_LETTER,
      displayName: 'Hebrew Letter',
      targetEntityType: EntityType.HEBREW_LETTER,
      allowMultiple: false,
      sortOrder: 3,
    },
  ],
}
