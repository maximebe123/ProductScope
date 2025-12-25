import { memo } from 'react'
import { X, Plus, FolderOpen } from 'lucide-react'
import { VolumeAttachment } from '../Nodes/BaseNode'

interface NodeVolumeEditorProps {
  volumes: VolumeAttachment[]
  volumeName: string
  volumePath: string
  onVolumeNameChange: (value: string) => void
  onVolumePathChange: (value: string) => void
  onAddVolume: () => void
  onRemoveVolume: (index: number) => void
}

const NodeVolumeEditor = memo(function NodeVolumeEditor({
  volumes,
  volumeName,
  volumePath,
  onVolumeNameChange,
  onVolumePathChange,
  onAddVolume,
  onRemoveVolume,
}: NodeVolumeEditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      onAddVolume()
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <span className="flex items-center gap-2">
          <FolderOpen size={14} className="text-amber-500" />
          Volumes
        </span>
      </label>

      {/* Existing volumes list */}
      {volumes.length > 0 && (
        <div className="space-y-2 mb-3">
          {volumes.map((vol, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100"
            >
              <FolderOpen size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700 truncate">
                  {vol.name}
                </div>
                <div className="text-xs text-gray-400 truncate">{vol.mountPath}</div>
              </div>
              <button
                onClick={() => onRemoveVolume(index)}
                className="p-1 rounded hover:bg-amber-100 transition-colors"
              >
                <X size={14} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add volume form */}
      <div className="space-y-2">
        <input
          type="text"
          value={volumeName}
          onChange={(e) => onVolumeNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Volume name"
          className="
            w-full px-3 py-2
            border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:border-transparent
            text-sm transition-shadow
          "
          style={{
            // @ts-expect-error CSS custom property
            '--tw-ring-color': '#f59e0b40',
          }}
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={volumePath}
            onChange={(e) => onVolumePathChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Mount path (e.g. /data)"
            className="
              flex-1 px-3 py-2
              border border-gray-300 rounded-lg
              focus:outline-none focus:ring-2 focus:border-transparent
              text-sm transition-shadow
            "
            style={{
              // @ts-expect-error CSS custom property
              '--tw-ring-color': '#f59e0b40',
            }}
          />
          <button
            onClick={onAddVolume}
            disabled={!volumeName.trim() || !volumePath.trim()}
            className="
              px-3 py-2 rounded-lg
              text-white text-sm font-medium
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              bg-amber-500 hover:bg-amber-600
            "
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {volumes.length === 0 && (
        <p className="text-xs text-gray-400 italic mt-2">No volumes attached</p>
      )}
    </div>
  )
})

export default NodeVolumeEditor
