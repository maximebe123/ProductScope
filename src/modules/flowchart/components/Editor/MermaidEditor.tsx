/**
 * Mermaid Editor Component
 * Monaco Editor with Mermaid syntax highlighting
 */

import { useRef, useCallback } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

interface MermaidEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export default function MermaidEditor({ value, onChange, className = '' }: MermaidEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor

    // Register Mermaid language
    monaco.languages.register({ id: 'mermaid' })

    // Define syntax highlighting
    monaco.languages.setMonarchTokensProvider('mermaid', {
      keywords: [
        'flowchart', 'graph', 'subgraph', 'end', 'direction',
        'TB', 'TD', 'BT', 'RL', 'LR',
        'click', 'style', 'classDef', 'class', 'linkStyle',
      ],
      shapes: [
        'rect', 'circle', 'diamond', 'stadium', 'subroutine',
        'cylinder', 'round', 'asymmetric', 'rhombus',
        'hexagon', 'parallelogram', 'trapezoid', 'double-circle',
      ],

      tokenizer: {
        root: [
          // Comments
          [/%%.*$/, 'comment'],

          // Keywords
          [/\b(flowchart|graph|subgraph|end|direction)\b/, 'keyword'],
          [/\b(TB|TD|BT|RL|LR)\b/, 'keyword.direction'],

          // Arrows and connections
          [/-->|---|-\.-|==>|--o|--x|<-->|o--o|x--x/, 'operator.arrow'],
          [/\|[^|]*\|/, 'string.label'],

          // Node definitions with shapes
          [/\[\[.*?\]\]/, 'type.subroutine'],
          [/\[\(.*?\)\]/, 'type.database'],
          [/\[\/.*?\/\]/, 'type.parallelogram'],
          [/\(\[.*?\]\)/, 'type.stadium'],
          [/\(\(.*?\)\)/, 'type.circle'],
          [/\{.*?\}/, 'type.diamond'],
          [/\[.*?\]/, 'type.rectangle'],
          [/\(.*?\)/, 'type.rounded'],

          // @ shapes
          [/@\{[^}]*\}/, 'type.custom'],

          // Node IDs
          [/[A-Za-z_][A-Za-z0-9_]*/, 'identifier'],

          // Strings
          [/"[^"]*"/, 'string'],
          [/'[^']*'/, 'string'],

          // Numbers
          [/\d+/, 'number'],
        ],
      },
    })

    // Define theme colors
    monaco.editor.defineTheme('mermaid-theme', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0230a8', fontStyle: 'bold' },
        { token: 'keyword.direction', foreground: '0230a8' },
        { token: 'operator.arrow', foreground: '666666', fontStyle: 'bold' },
        { token: 'string.label', foreground: 'c41a16' },
        { token: 'string', foreground: 'c41a16' },
        { token: 'type.rectangle', foreground: '0230a8' },
        { token: 'type.rounded', foreground: '0230a8' },
        { token: 'type.stadium', foreground: '2e7d32' },
        { token: 'type.diamond', foreground: 'f57c00' },
        { token: 'type.circle', foreground: '7b1fa2' },
        { token: 'type.database', foreground: '1565c0' },
        { token: 'type.subroutine', foreground: '5d4037' },
        { token: 'type.parallelogram', foreground: '00838f' },
        { token: 'type.custom', foreground: '6a1b9a' },
        { token: 'identifier', foreground: '333333' },
        { token: 'comment', foreground: '999999', fontStyle: 'italic' },
        { token: 'number', foreground: '1c00cf' },
      ],
      colors: {
        'editor.background': '#fafafa',
        'editor.lineHighlightBackground': '#f0f0f0',
      },
    })

    monaco.editor.setTheme('mermaid-theme')

    // Auto-completion
    monaco.languages.registerCompletionItemProvider('mermaid', {
      provideCompletionItems: (model: editor.ITextModel, position: { lineNumber: number; column: number }) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const suggestions = [
          // Flowchart start
          { label: 'flowchart TB', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'flowchart TB\n    ', range, documentation: 'Top to Bottom flowchart' },
          { label: 'flowchart LR', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'flowchart LR\n    ', range, documentation: 'Left to Right flowchart' },
          { label: 'flowchart BT', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'flowchart BT\n    ', range, documentation: 'Bottom to Top flowchart' },
          { label: 'flowchart RL', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'flowchart RL\n    ', range, documentation: 'Right to Left flowchart' },

          // Basic Shapes
          { label: 'start/end', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '([${1:Label}])', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Stadium shape for start/end' },
          { label: 'process', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '[${1:Label}]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Rectangle for process' },
          { label: 'decision', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '{${1:Label}}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Diamond for decision' },
          { label: 'database', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '[(${1:Label})]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Cylinder for database' },
          { label: 'subprocess', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '[[${1:Label}]]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Subroutine/subprocess' },
          { label: 'connector', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '((${1:Label}))', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Circle connector' },
          { label: 'data', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '[/${1:Label}/]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Parallelogram for data I/O' },

          // Geometric Shapes
          { label: 'hexagon', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '{{${1:Label}}}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Hexagon for preparation' },
          { label: 'double-circle', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '(((${1:Label})))', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Double circle for stop' },
          { label: 'trapezoid', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '[/${1:Label}\\\\]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Trapezoid shape' },
          { label: 'flag', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '>${1:Label}]', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Flag/Banner asymmetric shape' },

          // Extended @ Shapes
          { label: 'document', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '@{ shape: doc, label: "${1:Label}" }', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Document shape' },
          { label: 'documents', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '@{ shape: docs, label: "${1:Label}" }', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Multiple documents' },
          { label: 'fork-join', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '@{ shape: fork, label: "${1:Label}" }', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Fork/Join parallel gateway' },
          { label: 'loop', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '@{ shape: lean-r, label: "${1:Label}" }', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Loop marker' },
          { label: 'comment', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '@{ shape: braces, label: "${1:Note}" }', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Comment/annotation' },
          { label: 'error', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '@{ shape: bolt, label: "${1:Error}" }', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Error/exception' },
          { label: 'timer', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '@{ shape: hourglass, label: "${1:Wait}" }', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Timer/delay' },
          { label: 'display', kind: monaco.languages.CompletionItemKind.Snippet, insertText: '@{ shape: curv-trap, label: "${1:Display}" }', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Display output' },

          // Subgraph
          { label: 'subgraph', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'subgraph "${1:Name}"\n    ${2:content}\nend', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Create a subgraph/swimlane' },

          // Arrows
          { label: 'arrow', kind: monaco.languages.CompletionItemKind.Operator, insertText: ' --> ', range, documentation: 'Arrow connection' },
          { label: 'arrow with label', kind: monaco.languages.CompletionItemKind.Snippet, insertText: ' -->|${1:label}| ', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Arrow with label' },
          { label: 'dotted arrow', kind: monaco.languages.CompletionItemKind.Operator, insertText: ' -.-> ', range, documentation: 'Dotted arrow' },
          { label: 'thick arrow', kind: monaco.languages.CompletionItemKind.Operator, insertText: ' ==> ', range, documentation: 'Thick arrow' },
          { label: 'bidirectional', kind: monaco.languages.CompletionItemKind.Operator, insertText: ' <--> ', range, documentation: 'Bidirectional arrow' },

          // Styling
          { label: 'style', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'style ${1:nodeId} fill:${2:#fff},stroke:${3:#333},stroke-width:${4:2}px', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Style a node' },
          { label: 'classDef', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'classDef ${1:className} fill:${2:#fff},stroke:${3:#333}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Define a reusable style class' },
          { label: 'class', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'class ${1:nodeIds} ${2:className}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Apply class to nodes' },
          { label: 'linkStyle', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'linkStyle ${1:0} stroke:${2:#333},stroke-width:${3:2}px', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Style a link/edge' },

          // Common style classes
          { label: 'classDef success', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'classDef success fill:#d1fae5,stroke:#10b981', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Success style (green)' },
          { label: 'classDef error', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'classDef error fill:#fee2e2,stroke:#ef4444', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Error style (red)' },
          { label: 'classDef highlight', kind: monaco.languages.CompletionItemKind.Snippet, insertText: 'classDef highlight fill:#ffcf00,stroke:#0230a8,stroke-width:3px', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, documentation: 'Highlight style (yellow)' },
        ]

        return { suggestions }
      },
    })
  }, [])

  const handleChange: OnChange = useCallback((value) => {
    onChange(value || '')
  }, [onChange])

  return (
    <div className={`h-full ${className}`}>
      <Editor
        height="100%"
        defaultLanguage="mermaid"
        value={value}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          tabSize: 4,
          insertSpaces: true,
          folding: true,
          renderLineHighlight: 'line',
          padding: { top: 16, bottom: 16 },
        }}
        loading={
          <div className="flex items-center justify-center h-full text-gray-400">
            Loading editor...
          </div>
        }
      />
    </div>
  )
}
