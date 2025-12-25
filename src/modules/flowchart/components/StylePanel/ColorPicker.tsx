/**
 * Color Picker Component
 * Allows selecting colors from presets or entering custom hex values
 */

import { PRESET_COLORS } from '../../utils/styleHelpers'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
  showNone?: boolean
}

export default function ColorPicker({ label, value, onChange, showNone = false }: ColorPickerProps) {
  const handlePresetClick = (color: string) => {
    onChange(color)
  }

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleNoneClick = () => {
    onChange('')
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600">{label}</label>

      {/* Preset colors */}
      <div className="flex flex-wrap gap-1">
        {showNone && (
          <button
            onClick={handleNoneClick}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center text-xs ${
              value === '' ? 'border-primary' : 'border-gray-200'
            }`}
            title="None"
          >
            <span className="text-gray-400">-</span>
          </button>
        )}
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => handlePresetClick(color)}
            className={`w-6 h-6 rounded border-2 transition-all ${
              value === color ? 'border-primary scale-110' : 'border-gray-200 hover:border-gray-400'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {/* Custom color input */}
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={handleCustomChange}
          className="w-8 h-8 rounded cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:border-primary font-mono"
        />
      </div>
    </div>
  )
}
