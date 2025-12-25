/**
 * Theme Palette Component
 * Displays predefined style themes for quick application
 */

import { STYLE_THEMES } from '../../utils/styleHelpers'

interface ThemePaletteProps {
  onSelectTheme: (theme: (typeof STYLE_THEMES)[number]) => void
  selectedThemeId?: string
}

export default function ThemePalette({ onSelectTheme, selectedThemeId }: ThemePaletteProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600">Quick Themes</label>
      <div className="grid grid-cols-4 gap-2">
        {STYLE_THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => onSelectTheme(theme)}
            className={`p-2 rounded-lg border-2 transition-all hover:scale-105 ${
              selectedThemeId === theme.id
                ? 'border-primary shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            title={theme.name}
          >
            <div
              className="w-full h-6 rounded mb-1"
              style={{
                backgroundColor: theme.fill,
                border: `${theme.strokeWidth}px solid ${theme.stroke}`,
              }}
            />
            <span className="text-xs text-gray-600 truncate block">{theme.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
