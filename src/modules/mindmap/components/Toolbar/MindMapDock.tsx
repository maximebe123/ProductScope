/**
 * Mind Map Dock
 * Floating toolbar at bottom-center of canvas
 * Similar to Diagrams ExportMenu
 */

import { useState, useRef, useEffect } from 'react'
import {
  Undo2,
  Redo2,
  Maximize2,
  Upload,
  Download,
  ChevronDown,
  Image,
  FileCode,
  FileJson,
} from 'lucide-react'
import type { MindElixirData } from '../../types/mindElixir'

interface MindMapDockProps {
  onUndo: () => void
  onRedo: () => void
  onFitView: () => void
  onExportPng: () => Promise<Blob | null>
  onExportSvg: () => Blob | null
  onGetData: () => MindElixirData | null
  onImport: (data: MindElixirData) => void
  lastSaved?: Date | null
}

export function MindMapDock({
  onUndo,
  onRedo,
  onFitView,
  onExportPng,
  onExportSvg,
  onGetData,
  onImport,
  lastSaved,
}: MindMapDockProps) {
  const [isExportOpen, setIsExportOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExportPng = async () => {
    const blob = await onExportPng()
    if (blob) downloadBlob(blob, 'mindmap.png')
    setIsExportOpen(false)
  }

  const handleExportSvg = () => {
    const blob = onExportSvg()
    if (blob) downloadBlob(blob, 'mindmap.svg')
    setIsExportOpen(false)
  }

  const handleExportJson = () => {
    const data = onGetData()
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      downloadBlob(blob, 'mindmap.json')
    }
    setIsExportOpen(false)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string) as MindElixirData
        onImport(data)
      } catch (err) {
        console.error('Import error:', err)
      }
    }
    reader.readAsText(file)

    // Reset input so same file can be imported again
    e.target.value = ''
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white/90 backdrop-blur-sm rounded-full border border-gray-200 shadow-lg">
        {/* Undo */}
        <button
          onClick={onUndo}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Fit View */}
        <button
          onClick={onFitView}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
          title="Fit to view"
        >
          <Maximize2 size={16} />
        </button>

        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* Import */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
          title="Import JSON"
        >
          <Upload size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />

        {/* Export dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className="flex items-center gap-1 p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
            title="Export"
          >
            <Download size={16} />
            <ChevronDown size={12} />
          </button>

          {isExportOpen && (
            <div className="absolute bottom-full mb-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px]">
              <button
                onClick={handleExportPng}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Image size={14} className="text-gray-500" />
                PNG Image
              </button>
              <button
                onClick={handleExportSvg}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileCode size={14} className="text-gray-500" />
                SVG Vector
              </button>
              <button
                onClick={handleExportJson}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <FileJson size={14} className="text-gray-500" />
                JSON
              </button>
            </div>
          )}
        </div>

        {/* Auto-save indicator */}
        {lastSaved && (
          <>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <div className="flex items-center gap-1.5 px-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              {formatTime(lastSaved)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default MindMapDock
