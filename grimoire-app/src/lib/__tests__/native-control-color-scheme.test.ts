/**
 * native-control-color-scheme.test.ts
 * Regression guard for a recurring styling bug: a native form control that
 * opens its own OS/browser-drawn popup — <select>'s dropdown list, or a
 * native date/time/color <input>'s picker — ignores this app's dark theme
 * entirely unless its inline style sets `colorScheme: 'dark'`. Without it,
 * the popup renders in the OS's light-mode palette (white background, black
 * text), clashing with the surrounding UI. This has bitten the app more than
 * once (see the many `colorScheme: 'dark'` entries already scattered across
 * src/), most recently on LocationInput.tsx's new UTC-offset and DST-rule
 * <select> elements.
 *
 * This scans every .tsx file's AST (via the TypeScript compiler API — a
 * real parse, not text/regex matching, so multi-line attributes and
 * unrelated substrings can't produce false results) for <select> and native
 * date/time-ish <input> elements, and checks that colorScheme is set on the
 * element's own style object, or on a named `React.CSSProperties`-ish
 * constant it spreads in (this app's two real patterns — see DateInput.tsx's
 * SELECT_STYLE and LocationInput.tsx's baseInput/smallSelect). Constant
 * lookup follows real lexical scoping (a stack of per-block frames, searched
 * innermost-out) rather than a flat per-file name map — two different
 * components in the same file both naming a local style constant
 * `inputStyle`, only one of which sets colorScheme, is a real pattern this
 * file already contains (read/decks.tsx) and a flat map gets it wrong.
 *
 * A style expression of any shape other than an object literal or a plain
 * identifier (a ternary, a function call, ...) can't be statically verified
 * either way, so it's conservatively treated as missing — a false positive
 * here is a one-line style fix; a false negative is the exact bug this test
 * exists to catch.
 */

import { describe, it, expect } from 'vitest'
import ts from 'typescript'

// Vite-native raw-file glob — deliberately NOT node:fs. vite.config.ts aliases
// 'fs'/'node:fs' to a throwing browser stub (for the real app bundle, where
// only SqliteAdapter/file-loader touch fs and are never reached via
// InMemoryAdapter), and Vitest inherits that same resolve.alias.
const files = import.meta.glob('/src/**/*.tsx', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

const FLAGGED_INPUT_TYPES = new Set(['date', 'time', 'datetime-local', 'month', 'week', 'color'])

interface Offender {
  file: string
  line: number
  tag: string
}

function findAttr(attrs: ts.JsxAttributes, name: string): ts.JsxAttribute | undefined {
  return attrs.properties.find(
    (p): p is ts.JsxAttribute => ts.isJsxAttribute(p) && p.name.getText() === name,
  )
}

function scanFile(relPath: string, text: string): Offender[] {
  const sourceFile = ts.createSourceFile(relPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const offenders: Offender[] = []

  // Scope-aware style-constant lookup: a stack of per-scope frames, searched
  // innermost-out, matching real `const` scoping. Each frame is fully
  // populated from its container's *direct* statement children before any
  // of that container's descendants are checked — a module-level `const`
  // used by a component function declared earlier in the file (a real
  // pattern here: read/record.tsx's `selectStyle`) is legal at runtime
  // (the function only runs after the whole module has evaluated) even
  // though it appears later in the file textually, so lookups can't be
  // limited to "already visited in file order."
  const scopeStack: Map<string, boolean>[] = []
  const lookup = (name: string): boolean => {
    for (let i = scopeStack.length - 1; i >= 0; i--) {
      const v = scopeStack[i].get(name)
      if (v !== undefined) return v
    }
    return false
  }

  const hasColorScheme = (obj: ts.ObjectLiteralExpression): boolean => {
    for (const prop of obj.properties) {
      if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name) && prop.name.text === 'colorScheme') return true
      if (ts.isShorthandPropertyAssignment(prop) && prop.name.text === 'colorScheme') return true
      if (ts.isSpreadAssignment(prop) && ts.isIdentifier(prop.expression) && lookup(prop.expression.text)) return true
    }
    return false
  }

  const styleAttrOk = (attrs: ts.JsxAttributes): boolean => {
    const styleAttr = findAttr(attrs, 'style')
    const init = styleAttr?.initializer
    if (!init || !ts.isJsxExpression(init) || !init.expression) return false
    const expr = init.expression
    if (ts.isObjectLiteralExpression(expr)) return hasColorScheme(expr)
    if (ts.isIdentifier(expr)) return lookup(expr.text)
    return false
  }

  const visit = (node: ts.Node): void => {
    const isScopeContainer = ts.isSourceFile(node) || ts.isBlock(node)
    if (isScopeContainer) {
      const frame = new Map<string, boolean>()
      scopeStack.push(frame)
      const statements = ts.isSourceFile(node) ? node.statements : (node as ts.Block).statements
      for (const stmt of statements) {
        if (!ts.isVariableStatement(stmt)) continue
        for (const decl of stmt.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
            frame.set(decl.name.text, hasColorScheme(decl.initializer))
          }
        }
      }
    }

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText()
      let tag: string | null = null

      if (tagName === 'select') {
        tag = 'select'
      } else if (tagName === 'input') {
        const typeAttr = findAttr(node.attributes, 'type')
        const typeInit = typeAttr?.initializer
        if (typeInit && ts.isStringLiteral(typeInit) && FLAGGED_INPUT_TYPES.has(typeInit.text)) {
          tag = `input[type="${typeInit.text}"]`
        }
      }

      if (tag && !styleAttrOk(node.attributes)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        offenders.push({ file: relPath, line: line + 1, tag })
      }
    }

    ts.forEachChild(node, visit)

    if (isScopeContainer) scopeStack.pop()
  }
  visit(sourceFile)

  return offenders
}

describe('Native form control dark styling', () => {
  it('every <select> and native date/time/color <input> sets colorScheme so its popup matches the dark theme', () => {
    const offenders = Object.entries(files).flatMap(([path, text]) => scanFile(path, text))

    expect(offenders).toEqual([])
  })
})
