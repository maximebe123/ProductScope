/**
 * Type definitions for diagram node configuration
 */

import type { LucideIcon } from 'lucide-react'

// Category identifiers (7 categories for Solution Architecture)
export type CategoryId =
  | 'applications'
  | 'data'
  | 'messaging'
  | 'integration'
  | 'security'
  | 'observability'
  | 'external'

// Category configuration
export interface CategoryConfig {
  id: CategoryId
  label: string
  color: string
  bgLight: string
  icon: LucideIcon
}

// Node type identifiers (39 types for Solution Architecture)
export type NodeTypeId =
  // Applications (6)
  | 'webapp'
  | 'mobile'
  | 'backend'
  | 'api'
  | 'function'
  | 'worker'
  // Data (7)
  | 'sql'
  | 'nosql'
  | 'keyvalue'
  | 'graph'
  | 'cache'
  | 'storage'
  | 'datalake'
  // Messaging (5)
  | 'queue'
  | 'stream'
  | 'pubsub'
  | 'eventbus'
  | 'webhook'
  // Integration (6)
  | 'gateway'
  | 'mesh'
  | 'bff'
  | 'loadbalancer'
  | 'cdn'
  | 'etl'
  // Security (5)
  | 'idp'
  | 'auth'
  | 'secrets'
  | 'waf'
  | 'certificate'
  // Observability (5)
  | 'logging'
  | 'metrics'
  | 'tracing'
  | 'alerting'
  | 'dashboard'
  // External (5)
  | 'actor'
  | 'thirdparty'
  | 'legacy'
  | 'partner'
  | 'cloud'

// Node type configuration
export interface NodeTypeConfig {
  id: NodeTypeId
  category: CategoryId
  label: string
  icon: LucideIcon
  description: string
  defaultLabel: string
}
