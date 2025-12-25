/**
 * Module Selector
 * Modern dropdown to switch between modules
 */

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useModuleContext } from '../../core/context/ModuleContext'

/**
 * Modern dropdown module selector
 */
export function ModuleSelector() {
  const { activeModule, availableModules, switchModule } = useModuleContext()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const ActiveIcon = activeModule.icon

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
          bg-gray-50 hover:bg-gray-100 border border-gray-200
          transition-all duration-150
          ${isOpen ? 'ring-2 ring-primary/20 border-primary/30' : ''}
        `}
      >
        <div className="p-1.5 rounded-md bg-primary/10">
          <ActiveIcon size={16} className="text-primary" strokeWidth={2} />
        </div>
        <span className="flex-1 text-left text-sm font-medium text-gray-700 truncate whitespace-nowrap">
          {activeModule.name}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="
            absolute top-full left-0 mt-1.5 z-50
            bg-white rounded-xl border border-gray-200 shadow-lg
            py-1.5 overflow-hidden min-w-full w-max
            animate-in fade-in slide-in-from-top-2 duration-150
          "
        >
          {availableModules.map((module) => {
            const Icon = module.icon
            const isActive = module.id === activeModule.id

            return (
              <button
                key={module.id}
                onClick={() => {
                  switchModule(module.id)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2.5
                  transition-colors duration-100
                  ${isActive
                    ? 'bg-primary/5'
                    : 'hover:bg-gray-50'
                  }
                `}
              >
                <div
                  className={`p-1.5 rounded-md ${
                    isActive ? 'bg-primary/10' : 'bg-gray-100'
                  }`}
                >
                  <Icon
                    size={16}
                    className={isActive ? 'text-primary' : 'text-gray-500'}
                    strokeWidth={2}
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className={`text-sm font-medium truncate ${isActive ? 'text-primary' : 'text-gray-700'}`}>
                    {module.name}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{module.description}</div>
                </div>
                {isActive && (
                  <Check size={16} className="text-primary" strokeWidth={2.5} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * Compact module selector for collapsed sidebar
 * Shows only active module icon, opens full dropdown on click
 */
export function ModuleSelectorCompact() {
  const { activeModule, availableModules, switchModule } = useModuleContext()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const ActiveIcon = activeModule.icon

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Compact trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full p-2.5 rounded-xl flex items-center justify-center
          bg-primary/10 hover:bg-primary/15
          transition-all duration-150
          ${isOpen ? 'ring-2 ring-primary/20' : ''}
        `}
        title={activeModule.name}
      >
        <ActiveIcon size={18} className="text-primary" strokeWidth={2} />
      </button>

      {/* Popover dropdown */}
      {isOpen && (
        <div
          className="
            absolute top-0 left-full ml-2 z-50
            bg-white rounded-xl border border-gray-200 shadow-xl
            py-1.5 w-max overflow-hidden
            animate-in fade-in slide-in-from-left-2 duration-150
          "
        >
          <div className="px-3 py-1.5 mb-1 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">
              Switch module
            </span>
          </div>
          {availableModules.map((module) => {
            const Icon = module.icon
            const isActive = module.id === activeModule.id

            return (
              <button
                key={module.id}
                onClick={() => {
                  switchModule(module.id)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2
                  transition-colors duration-100
                  ${isActive
                    ? 'bg-primary/5'
                    : 'hover:bg-gray-50'
                  }
                `}
              >
                <div
                  className={`p-1.5 rounded-md flex-shrink-0 ${
                    isActive ? 'bg-primary/10' : 'bg-gray-100'
                  }`}
                >
                  <Icon
                    size={14}
                    className={isActive ? 'text-primary' : 'text-gray-500'}
                    strokeWidth={2}
                  />
                </div>
                <span className={`text-sm whitespace-nowrap ${isActive ? 'font-medium text-primary' : 'text-gray-700'}`}>
                  {module.name}
                </span>
                {isActive && (
                  <Check size={14} className="ml-auto flex-shrink-0 text-primary" strokeWidth={2.5} />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
