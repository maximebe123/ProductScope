/**
 * Module Layout
 * Common layout wrapper for all modules
 */

import type { ReactNode } from 'react'
import type { ModuleDefinition } from '../../core/types/module'
import { useModuleContext } from '../../core/context/ModuleContext'

interface ModuleLayoutProps {
  children: ReactNode
  module: ModuleDefinition
}

/**
 * Module Layout Component
 * Wraps module content with optional module switcher (when multiple modules exist)
 */
export function ModuleLayout({ children, module }: ModuleLayoutProps) {
  const { availableModules, switchModule } = useModuleContext()
  const showModuleSwitcher = availableModules.length > 1

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">
      {/* Module Switcher Sidebar (only shown when multiple modules exist) */}
      {showModuleSwitcher && (
        <div className="flex flex-col bg-gray-900 p-2 gap-2">
          {availableModules.map((mod) => {
            const Icon = mod.icon
            const isActive = mod.id === module.id

            return (
              <button
                key={mod.id}
                onClick={() => switchModule(mod.id)}
                className={`
                  p-3 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }
                `}
                title={mod.name}
              >
                <Icon size={24} />
              </button>
            )
          })}
        </div>
      )}

      {/* Module Content */}
      <div className="flex-1 flex overflow-hidden">
        {children}
      </div>
    </div>
  )
}

/**
 * Module Loading Fallback
 */
export function ModuleLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-600">Loading module...</p>
      </div>
    </div>
  )
}
