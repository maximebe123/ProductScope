/**
 * Mind Map Sidebar - Clean minimal version
 */

import { useState } from 'react'
import { Keyboard, ChevronDown } from 'lucide-react'
import { ModuleSelector, ModuleSelectorCompact } from '../../../../shared/layouts/ModuleSelector'
import SidebarToggle from '../../../../shared/components/SidebarToggle'
import UserProfile from '../../../../shared/components/UserProfile'

export default function MindMapSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [showShortcuts, setShowShortcuts] = useState(true)

  const shortcuts = [
    { key: 'Tab', action: 'Add child' },
    { key: 'Enter', action: 'Add sibling' },
    { key: 'Delete', action: 'Delete' },
    { key: 'F2', action: 'Edit' },
    { key: '← →', action: 'Navigate' },
    { key: 'Ctrl+Z/Y', action: 'Undo/Redo' },
  ]

  const toggleCollapsed = () => setIsCollapsed((prev) => !prev)

  if (isCollapsed) {
    return (
      <div className="flex flex-col bg-white border-r border-gray-200 w-[68px] shrink-0 h-full">
        {/* Compact header */}
        <div className="border-b border-gray-200 p-3 flex justify-center">
          <img src="/logo.png" alt="ProductScope" className="w-8 h-8" />
        </div>

        {/* Module Selector - compact */}
        <div className="border-b border-gray-200 p-2">
          <ModuleSelectorCompact />
        </div>

        {/* Spacer */}
        <div className="flex-1" />

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
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="ProductScope" className="w-8 h-8" />
          <span className="font-semibold text-gray-900">ProductScope</span>
        </div>
      </div>

      {/* Module Selector */}
      <div className="border-b border-gray-200 p-3">
        <ModuleSelector />
      </div>

      {/* Keyboard shortcuts - collapsible */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <Keyboard size={16} />
            <span className="text-sm">Shortcuts</span>
          </div>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${showShortcuts ? 'rotate-180' : ''}`}
          />
        </button>

        {showShortcuts && (
          <div className="px-4 pb-3 space-y-1.5">
            {shortcuts.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-xs">
                <span className="text-gray-500">{s.action}</span>
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-gray-600">
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User Profile */}
      <UserProfile isCollapsed={isCollapsed} />

      {/* Collapse/Expand toggle */}
      <SidebarToggle isCollapsed={isCollapsed} onToggle={toggleCollapsed} />
    </div>
  )
}
