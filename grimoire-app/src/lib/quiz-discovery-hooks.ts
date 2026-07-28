/**
 * quiz-discovery-hooks.ts
 * React hooks wrapping the dynamic entity-type/question-def discovery in
 * quiz-engine.ts, shared by the preset editor and the one-time session
 * customizer so both stay in sync with the same live data automatically.
 */

import { useEffect, useState } from 'react'
import type { StorageAdapter } from '@grimoire/core'
import { discoverEntityTypes, discoverQuestionDefs, discoverGroupOverviews } from './quiz-engine'
import type { DiscoveredEntityType, QuestionTypeDef, GroupOverview } from './quiz-engine'

export interface EntityTypeDiscovery {
  entityTypes: DiscoveredEntityType[]
  defsByType: Record<string, QuestionTypeDef[]>
  defsLoading: Set<string>
  groupOverviews: Map<string, GroupOverview>
}

/**
 * Loads the full entity-type list and the group-overview map once (both
 * cheap), and lazily discovers question defs only for `enabledEntityTypes` —
 * def discovery does per-entity link lookups, so it's only worth paying for
 * types the user has actually enabled.
 */
export function useEntityTypeDiscovery(
  adapter: StorageAdapter | null,
  enabledEntityTypes: string[],
): EntityTypeDiscovery {
  const [entityTypes, setEntityTypes] = useState<DiscoveredEntityType[]>([])
  const [defsByType, setDefsByType] = useState<Record<string, QuestionTypeDef[]>>({})
  const [defsLoading, setDefsLoading] = useState<Set<string>>(new Set())
  const [groupOverviews, setGroupOverviews] = useState<Map<string, GroupOverview>>(new Map())

  useEffect(() => {
    if (!adapter) return
    discoverEntityTypes(adapter).then(setEntityTypes)
    discoverGroupOverviews(adapter).then(setGroupOverviews)
  }, [adapter])

  useEffect(() => {
    if (!adapter) return
    const toLoad = enabledEntityTypes.filter(et => !(et in defsByType) && !defsLoading.has(et))
    if (toLoad.length === 0) return
    setDefsLoading(prev => new Set([...prev, ...toLoad]))
    Promise.all(toLoad.map(async et => [et, await discoverQuestionDefs(adapter, et)] as const))
      .then(results => {
        setDefsByType(prev => {
          const next = { ...prev }
          for (const [et, defs] of results) next[et] = defs
          return next
        })
        setDefsLoading(prev => {
          const next = new Set(prev)
          for (const [et] of results) next.delete(et)
          return next
        })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter, enabledEntityTypes, defsByType, defsLoading])

  return { entityTypes, defsByType, defsLoading, groupOverviews }
}
