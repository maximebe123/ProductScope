/**
 * Node configuration - Main entry point
 * Re-exports all node config types and utilities
 */

// Types
export type { CategoryId, CategoryConfig, NodeTypeId, NodeTypeConfig } from './types'

// Category configuration
export { categories, categoryOrder } from './categories'

// Node types
export { nodeTypes } from './nodeTypes'

// Helper to get nodes by category
import type { CategoryId, NodeTypeConfig, NodeTypeId } from './types'
import { nodeTypes } from './nodeTypes'

export const getNodesByCategory = (categoryId: CategoryId): NodeTypeConfig[] => {
  return Object.values(nodeTypes).filter((node) => node.category === categoryId)
}

/**
 * Migration map from old node types to new Solution Architecture node types
 * Used for backwards compatibility with existing diagrams
 */
const LEGACY_NODE_TYPE_MAP: Record<string, NodeTypeId> = {
  // Direct mappings (same or similar)
  webapp: 'webapp',
  mobile: 'mobile',
  api: 'api',
  function: 'function',
  cache: 'cache',
  storage: 'storage',
  gateway: 'gateway',
  loadbalancer: 'loadbalancer',
  cdn: 'cdn',
  auth: 'auth',
  certificate: 'certificate',
  webhook: 'webhook',
  etl: 'etl',
  metrics: 'metrics',
  tracing: 'tracing',
  thirdparty: 'thirdparty',
  partner: 'partner',
  cloud: 'cloud',
  queue: 'queue',

  // Renamed nodes
  vault: 'secrets',
  logs: 'logging',
  alerts: 'alerting',
  user: 'actor',

  // Category changes / merges
  database: 'sql',
  message: 'pubsub',
  event: 'eventbus',

  // Infrastructure nodes -> Applications
  server: 'backend',
  container: 'backend',
  vm: 'backend',
  microservice: 'backend',
  desktop: 'webapp',

  // Infrastructure security -> WAF
  firewall: 'waf',
}

/**
 * Migrate a legacy node type to the new Solution Architecture schema
 * @param oldType The old node type ID
 * @param tags Optional tags that may help infer the correct new type
 * @returns The new NodeTypeId, or the original if already valid
 */
export const migrateNodeType = (oldType: string, tags?: string[]): NodeTypeId => {
  // If already a valid new type, return as-is
  if (oldType in nodeTypes) {
    return oldType as NodeTypeId
  }

  // Special case: infer database type from tags
  if (oldType === 'database' && tags?.length) {
    const tagString = tags.join(' ').toLowerCase()
    if (/mongo|firestore|couch|dynamo/.test(tagString)) return 'nosql'
    if (/neo4j|neptune|graph/.test(tagString)) return 'graph'
    if (/redis/.test(tagString)) return 'keyvalue'
  }

  // Use migration map
  return LEGACY_NODE_TYPE_MAP[oldType] || 'backend'
}

/**
 * Check if a node type is valid (exists in current schema)
 */
export const isValidNodeType = (nodeType: string): nodeType is NodeTypeId => {
  return nodeType in nodeTypes
}
