/// <reference types="vite/client" />

declare module 'virtual:grimoire-data' {
  /** Map of relative file paths to parsed JSON content. e.g. "entities/tarot/rws-major.json" */
  const data: Record<string, unknown>
  export default data
}

/** Injected at build time from the VITE_APP_VERSION env var (set to the git tag in CI). */
declare const __APP_VERSION__: string
