/**
 * spread-hooks.ts
 * React hook for a merged spread lookup map that includes both built-in and
 * user-created custom spreads.
 */

import { useEffect, useMemo, useState } from 'react'
import { BUILT_IN_SPREADS } from '@/lib/built-in-data'
import type { SpreadDefinition } from '@/lib/built-in-data'
import { getAllCustomSpreads, spreadRecordToDefinition } from '@/lib/custom-db'

/**
 * Returns a Map<spreadId, SpreadDefinition> that starts with all built-in
 * spreads and is augmented with the user's custom spreads once the async DB
 * load completes.  Fallback to built-ins only keeps the UI functional even
 * if the DB call fails.
 */
export function useSpreadById(): Map<string, SpreadDefinition> {
  const [custom, setCustom] = useState<SpreadDefinition[]>([])

  useEffect(() => {
    getAllCustomSpreads()
      .then(records => setCustom(records.map(spreadRecordToDefinition)))
      .catch(() => {})
  }, [])

  return useMemo(() => {
    const map = new Map<string, SpreadDefinition>(BUILT_IN_SPREADS.map(s => [s.id, s]))
    for (const s of custom) map.set(s.id, s)
    return map
  }, [custom])
}
