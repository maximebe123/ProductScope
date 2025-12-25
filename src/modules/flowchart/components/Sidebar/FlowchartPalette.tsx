/**
 * Flowchart Palette Sidebar
 * Shows node snippets that can be inserted into the editor
 */

import { useState } from 'react'
import { ChevronDown, Plus, Workflow } from 'lucide-react'
import { ModuleSelector, ModuleSelectorCompact } from '../../../../shared/layouts/ModuleSelector'
import SidebarToggle from '../../../../shared/components/SidebarToggle'
import UserProfile from '../../../../shared/components/UserProfile'
import { NODE_SNIPPETS, SUBGRAPH_SNIPPET, SNIPPET_CATEGORIES } from '../../config/nodeConfig'

interface FlowchartPaletteProps {
  onInsertSnippet: (snippet: string) => void
}

export default function FlowchartPalette({ onInsertSnippet }: FlowchartPaletteProps) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['basic']))

  const toggleCollapsed = () => setIsCollapsed((prev) => !prev)

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const handleInsert = (syntax: string, label: string) => {
    // Generate unique ID based on label
    const nodeId =
      label
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 8) +
      '_' +
      Math.random().toString(36).slice(2, 6)
    const code = `    ${nodeId}${syntax.replace('Label', label)}`
    onInsertSnippet(code)
  }

  if (isCollapsed) {
    return (
      <div className="flex flex-col bg-white border-r border-gray-200 w-[68px] shrink-0 h-full">
        {/* Compact header */}
        <div className="border-b border-gray-200 p-3 flex justify-center">
          <div className="flex flex-col items-center py-1">
            <div className="text-xl font-bold leading-none tracking-tight">
              <span className="text-secondary">R'</span>
              <span className="text-primary">D</span>
            </div>
            <div className="text-[8px] text-gray-400 mt-1 uppercase tracking-widest">
              Flow
            </div>
          </div>
        </div>

        {/* Module Selector - compact */}
        <div className="border-b border-gray-200 p-2">
          <ModuleSelectorCompact />
        </div>

        {/* Snippet icons */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {NODE_SNIPPETS.slice(0, 6).map((snippet) => {
            const Icon = snippet.icon
            return (
              <button
                key={snippet.id}
                onClick={() => handleInsert(snippet.syntax, snippet.label)}
                className="w-full p-2.5 rounded-xl hover:bg-gray-100 flex items-center justify-center"
                title={`Insert ${snippet.label}`}
              >
                <Icon size={18} className="text-gray-600" />
              </button>
            )
          })}
        </div>

        {/* User Profile */}
        <UserProfile isCollapsed={isCollapsed} />

        {/* Collapse/Expand toggle */}
        <SidebarToggle isCollapsed={isCollapsed} onToggle={toggleCollapsed} />
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-white border-r border-gray-200 w-64 shrink-0 h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold">
          <span className="text-secondary">R'</span>
          <span className="text-primary">Diagrams</span>
        </h1>
      </div>

      {/* Module Selector */}
      <div className="border-b border-gray-200 p-3">
        <ModuleSelector />
      </div>

      {/* Node snippets */}
      <div className="flex-1 overflow-y-auto">
        {SNIPPET_CATEGORIES.map((category) => {
          const categorySnippets = NODE_SNIPPETS.filter((s) => s.category === category.id)
          if (categorySnippets.length === 0) return null

          const isExpanded = expandedCategories.has(category.id)

          return (
            <div key={category.id} className="border-b border-gray-100">
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">{category.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {categorySnippets.length}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Snippet items */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-1">
                  {categorySnippets.map((snippet) => {
                    const Icon = snippet.icon
                    return (
                      <button
                        key={snippet.id}
                        onClick={() => handleInsert(snippet.syntax, snippet.label)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <div className="p-1.5 rounded-md bg-primary/10">
                          <Icon size={16} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-700">{snippet.label}</div>
                          <div className="text-xs text-gray-400 font-mono truncate">
                            {snippet.syntax}
                          </div>
                        </div>
                        <Plus size={14} className="text-gray-400" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* Subgraph section */}
        <div className="border-b border-gray-100">
          <button
            onClick={() => toggleCategory('container')}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700">Containers</span>
            <ChevronDown
              size={16}
              className={`text-gray-400 transition-transform ${expandedCategories.has('container') ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedCategories.has('container') && (
            <div className="px-3 pb-3">
              <button
                onClick={() => onInsertSnippet('\n' + SUBGRAPH_SNIPPET + '\n')}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="p-1.5 rounded-md bg-secondary/20">
                  <Workflow size={16} className="text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700">Subgraph</div>
                  <div className="text-xs text-gray-400">Group / Swimlane</div>
                </div>
                <Plus size={14} className="text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 bg-gray-50/50 px-3 py-2">
        <p className="text-xs text-gray-400 text-center">Click to insert snippet at cursor</p>
      </div>

      {/* User Profile */}
      <UserProfile isCollapsed={isCollapsed} />

      {/* Collapse/Expand toggle */}
      <SidebarToggle isCollapsed={isCollapsed} onToggle={toggleCollapsed} />
    </div>
  )
}
