/**
 * RichTextEditor  — Tiptap WYSIWYG editor that serialises to/from Markdown.
 * RichTextRenderer — Read-only Markdown → HTML renderer.
 *
 * Both components apply the app's dark-theme CSS variables.
 */

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Markdown } from 'tiptap-markdown'
import React, { useEffect, useRef } from 'react'
import {
  Bold, Italic, Strikethrough, Code, Heading2, Heading3,
  List, ListOrdered, Quote, Minus, Undo, Redo, Table as TableIcon,
} from 'lucide-react'

// ─── Shared CSS injected once ──────────────────────────────────────────────────

const EDITOR_CSS = `
.ga-editor .ProseMirror {
  outline: none;
  min-height: 120px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--color-text);
  font-family: inherit;
}
.ga-editor .ProseMirror p { margin: 0 0 0.5em; }
.ga-editor .ProseMirror p:last-child { margin-bottom: 0; }
.ga-editor .ProseMirror h2 { font-size: 1.15em; font-weight: 600; margin: 0.9em 0 0.3em; color: var(--color-text); }
.ga-editor .ProseMirror h3 { font-size: 1.05em; font-weight: 600; margin: 0.8em 0 0.3em; color: var(--color-text); }
.ga-editor .ProseMirror h4 { font-size: 1em; font-weight: 600; margin: 0.7em 0 0.3em; color: var(--color-text); }
.ga-editor .ProseMirror strong { color: var(--color-text); }
.ga-editor .ProseMirror em { color: var(--color-text-muted); }
.ga-editor .ProseMirror s { opacity: 0.5; }
.ga-editor .ProseMirror ul, .ga-editor .ProseMirror ol { padding-left: 1.4em; margin: 0.3em 0 0.5em; }
.ga-editor .ProseMirror ul { list-style: disc; }
.ga-editor .ProseMirror ol { list-style: decimal; }
.ga-editor .ProseMirror li { margin: 0.1em 0; }
.ga-editor .ProseMirror table {
  border-collapse: collapse; margin: 0.5em 0; overflow: hidden;
  table-layout: fixed; width: 100%;
}
.ga-editor .ProseMirror th, .ga-editor .ProseMirror td {
  border: 1px solid var(--color-border); padding: 5px 8px;
  text-align: left; vertical-align: top; position: relative;
}
.ga-editor .ProseMirror th {
  background: var(--color-surface-3); color: var(--color-text);
  font-weight: 600;
}
.ga-editor .ProseMirror .selectedCell {
  background: rgba(180,156,90,0.14);
}
.ga-editor .ProseMirror blockquote {
  border-left: 3px solid var(--color-accent-muted);
  margin: 0.5em 0; padding: 0.2em 0.8em;
  color: var(--color-text-muted); font-style: italic;
}
.ga-editor .ProseMirror code {
  background: var(--color-surface-3); border-radius: 3px;
  padding: 1px 5px; font-size: 0.88em; font-family: monospace;
  color: var(--color-accent);
}
.ga-editor .ProseMirror pre {
  background: var(--color-surface-3); border-radius: 5px;
  padding: 10px 12px; margin: 0.5em 0; overflow-x: auto;
}
.ga-editor .ProseMirror pre code {
  background: none; padding: 0; font-size: 0.85em; color: var(--color-text);
}
.ga-editor .ProseMirror hr {
  border: none; border-top: 1px solid var(--color-border); margin: 0.8em 0;
}
.ga-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: var(--color-text-subtle); pointer-events: none; float: left; height: 0;
}

/* Renderer (read-only) */
.ga-renderer { font-size: 13px; line-height: 1.65; color: var(--color-text-muted); }
.ga-renderer p { margin: 0 0 0.5em; }
.ga-renderer p:last-child { margin-bottom: 0; }
.ga-renderer h2 { font-size: 1.1em; font-weight: 600; margin: 0.9em 0 0.3em; color: var(--color-text); }
.ga-renderer h3 { font-size: 1.02em; font-weight: 600; margin: 0.8em 0 0.3em; color: var(--color-text); }
.ga-renderer h4 { font-size: 1em; font-weight: 600; margin: 0.7em 0 0.3em; color: var(--color-text); }
.ga-renderer strong { color: var(--color-text); }
.ga-renderer em { color: var(--color-text-muted); }
.ga-renderer s { opacity: 0.5; }
.ga-renderer ul, .ga-renderer ol { padding-left: 1.4em; margin: 0.3em 0 0.5em; }
.ga-renderer ul { list-style: disc; }
.ga-renderer ol { list-style: decimal; }
.ga-renderer li { margin: 0.1em 0; }
.ga-renderer table {
  border-collapse: collapse; margin: 0.4em 0; font-size: 0.95em;
}
.ga-renderer th, .ga-renderer td {
  border: 1px solid var(--color-border); padding: 4px 8px; text-align: left;
}
.ga-renderer th { background: var(--color-surface-3); color: var(--color-text); font-weight: 600; }
.ga-renderer blockquote {
  border-left: 3px solid var(--color-accent-muted);
  margin: 0.5em 0; padding: 0.2em 0.8em;
  color: var(--color-text-muted); font-style: italic;
}
.ga-renderer code {
  background: var(--color-surface-3); border-radius: 3px;
  padding: 1px 5px; font-size: 0.85em; font-family: monospace;
  color: var(--color-accent);
}
.ga-renderer pre {
  background: var(--color-surface-3); border-radius: 5px;
  padding: 8px 10px; margin: 0.4em 0; overflow-x: auto;
}
.ga-renderer pre code { background: none; padding: 0; font-size: 0.85em; color: var(--color-text); }
.ga-renderer hr { border: none; border-top: 1px solid var(--color-border); margin: 0.8em 0; }
`

let cssInjected = false
function injectCss() {
  if (cssInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = EDITOR_CSS
  document.head.appendChild(style)
  cssInjected = true
}

// ─── Toolbar ───────────────────────────────────────────────────────────────────

type TiptapEditor = ReturnType<typeof useEditor>

function ToolbarBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '26px', height: '26px', borderRadius: '4px', border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        background: active ? 'var(--color-accent-muted)' : 'transparent',
        color: active ? 'var(--color-accent)' : disabled ? 'var(--color-text-subtle)' : 'var(--color-text-muted)',
        transition: 'background 0.1s',
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={e => { if (!disabled && !active) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-3)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = active ? 'var(--color-accent-muted)' : 'transparent' }}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <div style={{ width: '1px', height: '18px', background: 'var(--color-border)', margin: '0 2px' }} />
}

function Toolbar({ editor }: { editor: TiptapEditor }) {
  if (!editor) return null
  const e = editor
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '2px', flexWrap: 'wrap',
      padding: '4px 8px', borderBottom: '1px solid var(--color-border)',
      background: 'var(--color-surface-2)',
    }}>
      <ToolbarBtn onClick={() => e.chain().focus().toggleBold().run()} active={e.isActive('bold')} title="Bold (Ctrl+B)"><Bold size={13} /></ToolbarBtn>
      <ToolbarBtn onClick={() => e.chain().focus().toggleItalic().run()} active={e.isActive('italic')} title="Italic (Ctrl+I)"><Italic size={13} /></ToolbarBtn>
      <ToolbarBtn onClick={() => e.chain().focus().toggleStrike().run()} active={e.isActive('strike')} title="Strikethrough"><Strikethrough size={13} /></ToolbarBtn>
      <ToolbarBtn onClick={() => e.chain().focus().toggleCode().run()} active={e.isActive('code')} title="Inline code"><Code size={13} /></ToolbarBtn>
      <Sep />
      <ToolbarBtn onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()} active={e.isActive('heading', { level: 2 })} title="Heading 2"><Heading2 size={13} /></ToolbarBtn>
      <ToolbarBtn onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()} active={e.isActive('heading', { level: 3 })} title="Heading 3"><Heading3 size={13} /></ToolbarBtn>
      <Sep />
      <ToolbarBtn onClick={() => e.chain().focus().toggleBulletList().run()} active={e.isActive('bulletList')} title="Bullet list"><List size={13} /></ToolbarBtn>
      <ToolbarBtn onClick={() => e.chain().focus().toggleOrderedList().run()} active={e.isActive('orderedList')} title="Numbered list"><ListOrdered size={13} /></ToolbarBtn>
      <ToolbarBtn onClick={() => e.chain().focus().toggleBlockquote().run()} active={e.isActive('blockquote')} title="Blockquote"><Quote size={13} /></ToolbarBtn>
      <ToolbarBtn onClick={() => e.chain().focus().toggleCodeBlock().run()} active={e.isActive('codeBlock')} title="Code block"><Code size={14} /></ToolbarBtn>
      <ToolbarBtn onClick={() => e.chain().focus().setHorizontalRule().run()} title="Horizontal rule"><Minus size={13} /></ToolbarBtn>
      <Sep />
      {e.isActive('table')
        ? <ToolbarBtn onClick={() => e.chain().focus().deleteTable().run()} active title="Remove table"><TableIcon size={13} /></ToolbarBtn>
        : <ToolbarBtn onClick={() => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table"><TableIcon size={13} /></ToolbarBtn>
      }
      <Sep />
      <ToolbarBtn onClick={() => e.chain().focus().undo().run()} disabled={!e.can().undo()} title="Undo"><Undo size={13} /></ToolbarBtn>
      <ToolbarBtn onClick={() => e.chain().focus().redo().run()} disabled={!e.can().redo()} title="Redo"><Redo size={13} /></ToolbarBtn>
    </div>
  )
}

// ─── RichTextEditor ────────────────────────────────────────────────────────────

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 120,
}: {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  minHeight?: number
}) {
  injectCss()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Markdown.configure({ html: false, transformPastedText: true }),
    ],
    content: value,  // tiptap-markdown parses this as Markdown on init
    editorProps: {
      attributes: {
        'data-placeholder': placeholder ?? 'Write here…',
        class: '',
      },
    },
    onUpdate({ editor }) {
      const md = (editor.storage.markdown as { getMarkdown(): string }).getMarkdown()
      onChangeRef.current(md)
    },
  })

  // Sync external value changes (e.g. reset after save)
  const lastValue = useRef(value)
  useEffect(() => {
    if (!editor || value === lastValue.current) return
    lastValue.current = value
    const current = (editor.storage.markdown as { getMarkdown(): string }).getMarkdown()
    if (current !== value) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  return (
    <div
      className="ga-editor"
      style={{
        border: '1px solid var(--color-border)', borderRadius: '6px',
        overflow: 'hidden', background: 'var(--color-surface-3)',
      }}
    >
      <Toolbar editor={editor} />
      <div style={{ minHeight }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

// ─── RichTextRenderer ──────────────────────────────────────────────────────────
// Converts Markdown to HTML and renders it safely.

function markdownToHtml(md: string): string {
  if (!md) return ''
  // Process line by line, building HTML
  const lines = md.split('\n')
  const out: string[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let inOl = false
  let inUl = false

  const flushList = () => {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,         '<em>$1</em>')
      .replace(/_(.+?)_/g,           '<em>$1</em>')
      .replace(/~~(.+?)~~/g,         '<s>$1</s>')
      .replace(/`([^`]+)`/g,         '<code>$1</code>')

  // GFM tables: a "| a | b |" row immediately followed by a "| --- | --- |"
  // delimiter row starts a table; subsequent "|"-rows are body rows.
  const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line)
  const isDelimiterRow = (line: string) => /^\s*\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(line)
  const splitTableRow = (line: string): string[] => {
    let s = line.trim()
    if (s.startsWith('|')) s = s.slice(1)
    if (s.endsWith('|')) s = s.slice(0, -1)
    return s.split('|').map(c => c.trim())
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (inCodeBlock) {
        out.push(`<pre><code>${esc(codeLines.join('\n'))}</code></pre>`)
        codeLines = []; inCodeBlock = false
      } else {
        flushList(); inCodeBlock = true
      }
      continue
    }
    if (inCodeBlock) { codeLines.push(line); continue }

    if (isTableRow(line) && i + 1 < lines.length && isDelimiterRow(lines[i + 1])) {
      flushList()
      const headers = splitTableRow(line)
      out.push('<table><thead><tr>')
      for (const h of headers) out.push(`<th>${inline(h)}</th>`)
      out.push('</tr></thead><tbody>')
      i += 2 // skip header row + delimiter row
      while (i < lines.length && isTableRow(lines[i])) {
        out.push('<tr>')
        for (const cell of splitTableRow(lines[i])) out.push(`<td>${inline(cell)}</td>`)
        out.push('</tr>')
        i++
      }
      out.push('</tbody></table>')
      i-- // compensate for the loop's own i++
      continue
    }

    if (line.startsWith('#### ')) { flushList(); out.push(`<h4>${inline(line.slice(5))}</h4>`); continue }
    if (line.startsWith('### '))  { flushList(); out.push(`<h3>${inline(line.slice(4))}</h3>`); continue }
    if (line.startsWith('## '))   { flushList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue }
    if (line.startsWith('# '))    { flushList(); out.push(`<h2>${inline(line.slice(2))}</h2>`); continue }
    if (line.startsWith('> '))    { flushList(); out.push(`<blockquote><p>${inline(line.slice(2))}</p></blockquote>`); continue }
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/) || line.match(/^___+$/)) { flushList(); out.push('<hr />'); continue }

    const olMatch = line.match(/^(\d+)\. (.*)/)
    if (olMatch) {
      if (!inOl) { if (inUl) { out.push('</ul>'); inUl = false } out.push('<ol>'); inOl = true }
      out.push(`<li>${inline(olMatch[2])}</li>`); continue
    }
    const ulMatch = line.match(/^[-*+] (.*)/)
    if (ulMatch) {
      if (!inUl) { if (inOl) { out.push('</ol>'); inOl = false } out.push('<ul>'); inUl = true }
      out.push(`<li>${inline(ulMatch[1])}</li>`); continue
    }

    flushList()
    if (line.trim() === '') { out.push('<p></p>'); continue }
    out.push(`<p>${inline(line)}</p>`)
  }
  flushList()
  return out.join('')
}

export function RichTextRenderer({ markdown }: { markdown: string }) {
  injectCss()
  const html = markdownToHtml(markdown)
  return (
    <div
      className="ga-renderer"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/** Returns true if the markdown string has any real content. */
export function isRichTextEmpty(md: string): boolean {
  return !md || md.trim() === ''
}
