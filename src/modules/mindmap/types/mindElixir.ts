/**
 * MindElixir Types and Utilities
 * Re-exports from mind-elixir with custom extensions
 */

import type {
  MindElixirData,
  MindElixirInstance,
  NodeObj,
  Options as MindElixirOptions,
  Theme,
} from 'mind-elixir'

// Re-export types from mind-elixir
export type {
  MindElixirData,
  MindElixirInstance,
  NodeObj,
  MindElixirOptions,
  Theme,
}

/**
 * Extended node object with our custom properties
 */
export interface ExtendedNodeObj extends NodeObj {
  /**
   * Flag to identify note nodes
   */
  isNote?: boolean
}

/**
 * MindElixir canvas state
 */
export interface MindElixirState {
  instance: MindElixirInstance | null
  data: MindElixirData | null
  selectedNode: NodeObj | null
}

/**
 * R'Diagrams Brand Colors
 * Primary: Blue #0230a8
 * Secondary: Yellow #ffcf00
 */
const BRAND = {
  // Blues (primary)
  blue: {
    900: '#011d6b',    // Darkest
    800: '#0230a8',    // Primary
    700: '#0340c9',    // Lighter
    600: '#1a5cd6',    // Medium
    500: '#3d7be6',    // Light
    100: '#e6edfa',    // Very light background
  },
  // Yellows (secondary)
  yellow: {
    700: '#cca600',    // Darker
    600: '#e6b800',    // Dark
    500: '#ffcf00',    // Secondary
    400: '#ffd633',    // Light
    300: '#ffdf5c',    // Lighter
    100: '#fff9e6',    // Very light background
  },
}

/**
 * R'Diagrams theme for MindElixir
 * Uses only blue and yellow shades from the brand DA
 */
export const RDIAGRAMS_THEME: Theme = {
  name: 'rdiagrams',
  type: 'light',
  // Palette for branch colors - alternating blues and yellows
  palette: [
    BRAND.blue[800],   // Primary blue
    BRAND.yellow[500], // Secondary yellow
    BRAND.blue[600],   // Medium blue
    BRAND.yellow[600], // Dark yellow
    BRAND.blue[500],   // Light blue
    BRAND.yellow[400], // Light yellow
  ],
  cssVar: {
    '--node-gap-x': '20px',
    '--node-gap-y': '16px',
    '--main-gap-x': '60px',
    '--main-gap-y': '24px',
    '--main-color': BRAND.blue[800],
    '--main-bgcolor': '#ffffff',
    '--color': '#1a1a2e',
    '--bgcolor': '#fafbfc',
    '--selected': BRAND.yellow[500],
    '--accent-color': BRAND.yellow[500],
    '--root-color': '#ffffff',
    '--root-bgcolor': BRAND.blue[800],
    '--root-border-color': BRAND.blue[900],
    '--root-radius': '24px',
    '--main-radius': '12px',
    '--topic-padding': '12px 20px',
    '--panel-color': BRAND.blue[900],
    '--panel-bgcolor': '#ffffff',
    '--panel-border-color': BRAND.blue[100],
    '--map-padding': '40px',
  },
}

/**
 * Note node style - using yellow tones
 */
export const NOTE_STYLE: NodeObj['style'] = {
  background: BRAND.yellow[100],
  color: BRAND.yellow[700],
  fontSize: '12px',
  border: `1px solid ${BRAND.yellow[500]}`,
}
