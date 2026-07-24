import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, extname, resolve, sep } from 'path'

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST
// @ts-expect-error process is a nodejs global
const appVersion: string = process.env.VITE_APP_VERSION ?? 'dev'

/** Build-time: bundle all JSON from grimoire-data/ as a virtual module */
function grimoireDataPlugin() {
  const VIRTUAL_ID = 'virtual:grimoire-data'
  const RESOLVED_ID = '\0virtual:grimoire-data'
  const dataDir = resolve(__dirname, '../grimoire-data')

  function readAllJson(dir: string): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    function walk(cur: string) {
      for (const name of readdirSync(cur)) {
        const full = join(cur, name)
        if (statSync(full).isDirectory()) {
          walk(full)
        } else if (extname(name) === '.json') {
          // Always use forward slashes for the virtual module's keys, regardless of host OS —
          // manifest.json's file lists are authored with '/' and must match exactly on Windows,
          // where path.relative() otherwise returns '\'-separated paths.
          result[relative(dir, full).split(sep).join('/')] = JSON.parse(readFileSync(full, 'utf-8'))
        }
      }
    }
    walk(dir)
    return result
  }

  return {
    name: 'grimoire-data',
    resolveId(id: string) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id: string) {
      if (id !== RESOLVED_ID) return
      // Watch every JSON file in the data dir so HMR re-triggers on data changes
      const allFiles: string[] = []
      function collectFiles(dir: string) {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name)
          if (statSync(full).isDirectory()) collectFiles(full)
          else if (extname(name) === '.json') allFiles.push(full)
        }
      }
      collectFiles(dataDir)
      for (const f of allFiles) this.addWatchFile(f)
      return `export default ${JSON.stringify(readAllJson(dataDir))}`
    },
  }
}

export default defineConfig(async () => ({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
    grimoireDataPlugin(),
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Stub out Node.js-only modules pulled in by grimoire-core's SqliteAdapter/file-loader.
      // These are never called at runtime in the browser (InMemoryAdapter is used instead).
      'better-sqlite3': resolve(__dirname, 'src/lib/browser-stubs/better-sqlite3.ts'),
      'fs': resolve(__dirname, 'src/lib/browser-stubs/node-fs.ts'),
      'node:fs': resolve(__dirname, 'src/lib/browser-stubs/node-fs.ts'),
      'path': 'path-browserify',
      'node:path': 'path-browserify',
    },
  },

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
}))
