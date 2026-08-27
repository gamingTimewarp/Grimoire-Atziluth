import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/src-tauri/target/**',
      '**/src-tauri/gen/**',
      '.claude/**',
      '**/coverage/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // grimoire-core — Node/library code
  {
    files: ['grimoire-core/src/**/*.ts', 'grimoire-core/tests/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // grimoire-app — Vite + React
  {
    files: ['grimoire-app/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Only the two long-established hooks rules — eslint-plugin-react-hooks v7
      // folded in a much larger React Compiler-oriented rule set (purity,
      // immutability, set-state-in-render, …) under "recommended"; this codebase
      // wasn't written against those invariants, so pulling in the full set
      // would produce a wall of unfamiliar findings unrelated to real bugs.
      // Revisit if/when the app adopts the React Compiler.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Shared relaxations
  {
    rules: {
      // Allow an explicit `_` prefix to mark an intentionally unused
      // variable/argument (destructuring, callback signatures, etc.).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // This codebase's established idiom for toggling Set membership is
      // `set.has(x) ? set.delete(x) : set.add(x)` — a ternary used purely for
      // its side effects. Both branches are always side-effecting method
      // calls, so allow ternaries (and short-circuit &&/||) as statements.
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowTernary: true, allowShortCircuit: true },
      ],
    },
  },
)
