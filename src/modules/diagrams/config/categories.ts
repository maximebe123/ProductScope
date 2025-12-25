/**
 * Category configuration for diagram nodes
 * 7 categories optimized for Solution Architecture
 */

import {
  AppWindow,
  Database,
  Radio,
  Plug,
  Shield,
  Eye,
  ExternalLink,
} from 'lucide-react'

import type { CategoryId, CategoryConfig } from './types'

// Category definitions with colors and icons
export const categories: Record<CategoryId, CategoryConfig> = {
  applications: {
    id: 'applications',
    label: 'Applications',
    color: '#f97316',
    bgLight: '#fff7ed',
    icon: AppWindow,
  },
  data: {
    id: 'data',
    label: 'Data',
    color: '#0230a8',
    bgLight: '#e8edfa',
    icon: Database,
  },
  messaging: {
    id: 'messaging',
    label: 'Messaging',
    color: '#eab308',
    bgLight: '#fefce8',
    icon: Radio,
  },
  integration: {
    id: 'integration',
    label: 'Integration',
    color: '#10b981',
    bgLight: '#ecfdf5',
    icon: Plug,
  },
  security: {
    id: 'security',
    label: 'Security',
    color: '#f0285c',
    bgLight: '#fef2f4',
    icon: Shield,
  },
  observability: {
    id: 'observability',
    label: 'Observability',
    color: '#06b6d4',
    bgLight: '#ecfeff',
    icon: Eye,
  },
  external: {
    id: 'external',
    label: 'External',
    color: '#64748b',
    bgLight: '#f1f5f9',
    icon: ExternalLink,
  },
}

// Category display order
export const categoryOrder: CategoryId[] = [
  'applications',
  'data',
  'messaging',
  'integration',
  'security',
  'observability',
  'external',
]
