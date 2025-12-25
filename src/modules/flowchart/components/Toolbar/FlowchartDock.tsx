/**
 * Flowchart Dock Toolbar
 * Bottom-center floating toolbar
 */

import { useState, useRef } from 'react'
import {
  Undo2,
  Redo2,
  Download,
  ChevronDown,
  Image,
  FileCode,
  FileText,
  Copy,
  Check,
  Wand2,
  Loader2,
} from 'lucide-react'

interface FlowchartDockProps {
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  onExportPng: () => Promise<Blob | null>
  onExportSvg: () => Blob | null
  onExportMermaid: () => string
  lastSaved?: Date | null
  hasError?: boolean
  errorMessage?: string | null
  onFixSyntax?: () => Promise<void>
  isFixing?: boolean
}

export default function FlowchartDock({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExportPng,
  onExportSvg,
  onExportMermaid,
  lastSaved,
  hasError,
  errorMessage,
  onFixSyntax,
  isFixing,
}: FlowchartDockProps) {
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPng = async () => {
    const blob = await onExportPng()
    if (blob) downloadBlob(blob, 'flowchart.png')
    setIsExportOpen(false)
  }

  const handleExportSvg = () => {
    const blob = onExportSvg()
    if (blob) downloadBlob(blob, 'flowchart.svg')
    setIsExportOpen(false)
  }

  const handleExportMermaid = () => {
    const code = onExportMermaid()
    const blob = new Blob([code], { type: 'text/plain' })
    downloadBlob(blob, 'flowchart.mmd')
    setIsExportOpen(false)
  }

  const handleCopyCode = async () => {
    const code = onExportMermaid()
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setIsExportOpen(false)
  }

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white/90 backdrop-blur-sm rounded-full border border-gray-200 shadow-lg">
        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`
            p-2 rounded-lg transition-colors
            ${canUndo ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300 cursor-not-allowed'}
          `}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`
            p-2 rounded-lg transition-colors
            ${canRedo ? 'hover:bg-gray-100 text-gray-700' : 'text-gray-300 cursor-not-allowed'}
          `}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Export dropdown */}
        <div className="relative" ref={exportRef}>
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
          >
            <Download size={16} />
            <ChevronDown size={12} className={`transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
          </button>

          {isExportOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsExportOpen(false)}
              />

              {/* Dropdown menu */}
              <div className="absolute bottom-full mb-2 right-0 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 min-w-[180px] z-50">
                <button
                  onClick={handleExportPng}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                >
                  <Image size={16} className="text-green-600" />
                  PNG Image
                </button>
                <button
                  onClick={handleExportSvg}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                >
                  <FileCode size={16} className="text-blue-600" />
                  SVG Vector
                </button>
                <button
                  onClick={handleExportMermaid}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                >
                  <FileText size={16} className="text-purple-600" />
                  Mermaid (.mmd)
                </button>

                <div className="h-px bg-gray-100 my-1" />

                <button
                  onClick={handleCopyCode}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={16} className="text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} className="text-gray-500" />
                      Copy to clipboard
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Status indicator */}
        {(lastSaved || hasError) && (
          <>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <div className="flex items-center gap-1.5 px-2 text-xs text-gray-500">
              <div className={`w-2 h-2 rounded-full ${hasError ? 'bg-yellow-500' : 'bg-green-500'}`} />
              {hasError ? 'Syntax error' : lastSaved ? formatTime(lastSaved) : null}
            </div>
          </>
        )}

        {/* Fix Syntax button - only shown when there's an error */}
        {hasError && onFixSyntax && (
          <>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={onFixSyntax}
              disabled={isFixing}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full
                transition-all
                ${isFixing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
                }
              `}
              title={errorMessage || 'Fix syntax errors with AI'}
            >
              {isFixing ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  Fix Syntax
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
