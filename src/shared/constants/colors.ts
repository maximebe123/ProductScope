/**
 * Shared color constants
 * Centralized color definitions used across the application
 */

// Brand colors
export const BRAND_COLORS = {
  primary: '#0230a8',
  secondary: '#ffcf00',
  danger: '#f0285c',
} as const

// Semantic colors
export const SEMANTIC_COLORS = {
  success: '#10b981',
  warning: '#f97316',
  info: '#06b6d4',
  purple: '#8b5cf6',
} as const

// Category colors (for diagram nodes)
export const CATEGORY_COLORS = {
  applications: '#f97316',
  data: '#0230a8',
  messaging: '#eab308',
  integration: '#10b981',
  security: '#f0285c',
  observability: '#06b6d4',
  external: '#64748b',
} as const

// Category background colors (light variants)
export const CATEGORY_BG_COLORS = {
  applications: '#fff7ed',
  data: '#e8edfa',
  messaging: '#fefce8',
  integration: '#ecfdf5',
  security: '#fef2f4',
  observability: '#ecfeff',
  external: '#f1f5f9',
} as const

// Preset colors for color pickers
export const PRESET_COLORS = [
  // Brand colors
  '#0230a8', // primary blue
  '#ffcf00', // secondary yellow
  '#f0285c', // danger red
  // Semantic colors
  '#10b981', // success green
  '#f97316', // warning orange
  '#06b6d4', // info cyan
  '#8b5cf6', // purple
  // Basic colors
  '#ffffff', // white
  '#f3f4f6', // light gray
  '#9ca3af', // gray
  '#374151', // dark gray
  '#000000', // black
] as const

// Gray scale for UI elements
export const GRAY_SCALE = {
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
} as const

// Status colors
export const STATUS_COLORS = {
  draft: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-t-slate-300',
    bar: 'bg-slate-300',
  },
  active: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-t-emerald-400',
    bar: 'bg-emerald-400',
  },
  archived: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-t-amber-400',
    bar: 'bg-amber-400',
  },
  completed: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-t-blue-400',
    bar: 'bg-blue-400',
  },
} as const

// Type exports
export type BrandColor = keyof typeof BRAND_COLORS
export type SemanticColor = keyof typeof SEMANTIC_COLORS
export type CategoryColor = keyof typeof CATEGORY_COLORS
export type StatusColor = keyof typeof STATUS_COLORS
