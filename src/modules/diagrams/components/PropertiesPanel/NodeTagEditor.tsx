import { memo } from 'react'
import { X, Plus } from 'lucide-react'

interface NodeTagEditorProps {
  tags: string[]
  tagInput: string
  activeColor: string
  activeBgLight: string
  onTagInputChange: (value: string) => void
  onAddTag: () => void
  onRemoveTag: (index: number) => void
}

const NodeTagEditor = memo(function NodeTagEditor({
  tags,
  tagInput,
  activeColor,
  activeBgLight,
  onTagInputChange,
  onAddTag,
  onRemoveTag,
}: NodeTagEditorProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      onAddTag()
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={tagInput}
          onChange={(e) => onTagInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag (e.g., FastAPI)"
          className="
            flex-1 px-3 py-2
            border border-gray-300 rounded-lg
            focus:outline-none focus:ring-2 focus:border-transparent
            text-sm transition-shadow
          "
          style={{
            // @ts-expect-error CSS custom property
            '--tw-ring-color': `${activeColor}40`,
          }}
        />
        <button
          onClick={onAddTag}
          disabled={!tagInput.trim()}
          className="
            px-3 py-2 rounded-lg
            text-white text-sm font-medium
            transition-colors duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          style={{
            backgroundColor: tagInput.trim() ? activeColor : '#94a3b8',
          }}
        >
          <Plus size={16} />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="
                inline-flex items-center gap-1
                px-2.5 py-1 text-xs rounded-full
                group cursor-default
              "
              style={{
                backgroundColor: activeBgLight,
                color: activeColor,
              }}
            >
              {tag}
              <button
                onClick={() => onRemoveTag(index)}
                className="
                  ml-0.5 p-0.5 rounded-full
                  hover:bg-black/10
                  transition-colors
                "
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {tags.length === 0 && (
        <p className="text-xs text-gray-400 italic">No tags added yet</p>
      )}
    </div>
  )
})

export default NodeTagEditor
