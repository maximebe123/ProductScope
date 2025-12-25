import { useState, useRef, useCallback } from 'react'
import { Node, Edge } from 'reactflow'
import {
  Download,
  Upload,
  FileJson,
  FileText,
  Image,
  FileCode,
  ChevronDown,
  Undo2,
  Redo2,
  Grid3X3,
} from 'lucide-react'
import { BaseNodeData } from '../Nodes/BaseNode'
import {
  exportToJSON,
  exportToMarkdown,
  exportToPNG,
  exportToSVG,
  getExportFilename,
  DiagramExport,
} from '../../../../core/utils/exportUtils'
import {
  validateImport,
  parseImport,
  mergeImport,
  readFileAsJSON,
  ImportResult,
} from '../../utils/importUtils'

interface ExportMenuProps {
  nodes: Node<BaseNodeData>[]
  edges: Edge[]
  canvasRef: React.RefObject<HTMLElement | null>
  onImport: (nodes: Node<BaseNodeData>[], edges: Edge[]) => void
  lastSaved?: Date | null
  hasUnsavedChanges?: boolean
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  snapToGrid?: boolean
  onToggleSnap?: () => void
}

type ImportMode = 'replace' | 'merge' | null

const formatLastSaved = (date: Date | null | undefined): string => {
  if (!date) return ''
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)

  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes}m ago`
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const ExportMenu = ({ nodes, edges, canvasRef, onImport, lastSaved, hasUnsavedChanges, onUndo, onRedo, canUndo, canRedo, snapToGrid, onToggleSnap }: ExportMenuProps) => {
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [pendingImport, setPendingImport] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filename = getExportFilename('rdiagram')

  const handleExportJSON = useCallback(() => {
    exportToJSON(nodes, edges, filename)
    setIsExportOpen(false)
  }, [nodes, edges, filename])

  const handleExportMarkdown = useCallback(() => {
    exportToMarkdown(nodes, edges, filename)
    setIsExportOpen(false)
  }, [nodes, edges, filename])

  const handleExportPNG = useCallback(async () => {
    const element = canvasRef.current?.querySelector('.react-flow') as HTMLElement
    if (element) {
      await exportToPNG(element, filename, { transparent: true })
    }
    setIsExportOpen(false)
  }, [canvasRef, filename])

  const handleExportSVG = useCallback(async () => {
    const element = canvasRef.current?.querySelector('.react-flow') as HTMLElement
    if (element) {
      await exportToSVG(element, filename)
    }
    setIsExportOpen(false)
  }, [canvasRef, filename])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        setImportError(null)
        const data = await readFileAsJSON(file)
        const errors = validateImport(data)

        if (errors.length > 0) {
          setImportError(`Invalid file: ${errors[0].message}`)
          return
        }

        const result = parseImport(data as DiagramExport)

        // If there are existing nodes, show dialog
        if (nodes.length > 0) {
          setPendingImport(result)
          setShowImportDialog(true)
        } else {
          // No existing nodes, just import
          onImport(result.nodes, result.edges)
        }
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'Failed to import file')
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [nodes.length, onImport]
  )

  const handleImportConfirm = useCallback(
    (mode: ImportMode) => {
      if (!pendingImport || !mode) {
        setShowImportDialog(false)
        setPendingImport(null)
        return
      }

      if (mode === 'replace') {
        onImport(pendingImport.nodes, pendingImport.edges)
      } else if (mode === 'merge') {
        const merged = mergeImport(nodes, edges, pendingImport.nodes, pendingImport.edges)
        onImport(merged.nodes, merged.edges)
      }

      setShowImportDialog(false)
      setPendingImport(null)
    },
    [pendingImport, nodes, edges, onImport]
  )

  const exportOptions = [
    { icon: Image, label: 'PNG Image', onClick: handleExportPNG },
    { icon: FileCode, label: 'SVG Vector', onClick: handleExportSVG },
    { icon: FileText, label: 'Markdown', onClick: handleExportMarkdown },
    { icon: FileJson, label: 'JSON (Editable)', onClick: handleExportJSON },
  ]

  // Icon button style helper
  const iconBtnClass = (active?: boolean, disabled?: boolean) => `
    p-2 transition-colors
    ${disabled
      ? 'text-gray-300 cursor-not-allowed'
      : active
        ? 'text-primary bg-primary/10'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }
  `

  return (
    <>
      {/* Compact Dock */}
      <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm px-1 mb-4">
        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={iconBtnClass(false, !canUndo)}
          title="Undo (Cmd+Z)"
        >
          <Undo2 size={16} />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={iconBtnClass(false, !canRedo)}
          title="Redo (Cmd+Shift+Z)"
        >
          <Redo2 size={16} />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Snap to Grid */}
        <button
          onClick={onToggleSnap}
          className={iconBtnClass(snapToGrid)}
          title={snapToGrid ? 'Snap to grid: ON' : 'Snap to grid: OFF'}
        >
          <Grid3X3 size={16} />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-gray-200 mx-1" />

        {/* Import */}
        <button
          onClick={handleImportClick}
          className={iconBtnClass()}
          title="Import diagram"
        >
          <Upload size={16} />
        </button>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            className={`${iconBtnClass(isExportOpen)} rounded-r-full flex items-center`}
            title="Export diagram"
          >
            <Download size={16} />
            <ChevronDown size={12} className={`ml-0.5 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
          </button>

          {isExportOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsExportOpen(false)}
              />
              <div className="absolute right-0 bottom-full mb-2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[160px]">
                {exportOptions.map(({ icon: Icon, label, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="
                      w-full flex items-center gap-3 px-4 py-2.5
                      text-sm text-gray-700 hover:bg-gray-50
                      transition-colors text-left
                    "
                  >
                    <Icon size={16} className="text-gray-400" />
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Auto-save indicator - subtle dot */}
        {lastSaved && !hasUnsavedChanges && (
          <div
            className="w-1.5 h-1.5 rounded-full bg-green-400 ml-1 mr-2"
            title={`Auto-saved ${formatLastSaved(lastSaved)}`}
          />
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Import Error Toast */}
      {importError && (
        <div className="fixed bottom-4 right-4 z-50 bg-danger text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <span>{importError}</span>
          <button
            onClick={() => setImportError(null)}
            className="text-white/80 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Import Confirmation Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Import Diagram
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                You have an existing diagram. How would you like to proceed with the import?
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleImportConfirm('replace')}
                  className="
                    w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200
                    hover:border-primary hover:bg-primary/5 transition-colors text-left
                  "
                >
                  <div className="p-2 bg-danger/10 rounded-lg">
                    <FileJson size={20} className="text-danger" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Replace</div>
                    <div className="text-sm text-gray-500">
                      Clear current diagram and load imported one
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleImportConfirm('merge')}
                  className="
                    w-full flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200
                    hover:border-primary hover:bg-primary/5 transition-colors text-left
                  "
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileJson size={20} className="text-primary" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">Merge</div>
                    <div className="text-sm text-gray-500">
                      Add imported nodes to the existing diagram
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <button
                onClick={() => handleImportConfirm(null)}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ExportMenu
