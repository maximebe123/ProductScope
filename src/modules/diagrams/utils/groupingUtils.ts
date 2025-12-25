import { Node } from 'reactflow'
import { BaseNodeData } from '../components/Nodes/BaseNode'
import { GroupNodeData } from '../components/Nodes/GroupNode'

const DEFAULT_NODE_WIDTH = 180
const DEFAULT_NODE_HEIGHT = 80
const GROUP_PADDING = 40
const GROUP_HEADER_HEIGHT = 50

// Calculate the nesting depth of a node (0 for root nodes)
export function getNodeDepth(
  node: Node<BaseNodeData>,
  allNodes: Node<BaseNodeData>[]
): number {
  let depth = 0
  let currentParentId = node.parentNode
  while (currentParentId) {
    depth++
    const parent = allNodes.find((n) => n.id === currentParentId)
    currentParentId = parent?.parentNode
  }
  return depth
}

interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

export function calculateNodesBounds(nodes: Node<BaseNodeData>[]): Bounds {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  nodes.forEach((node) => {
    const width = node.width ?? DEFAULT_NODE_WIDTH
    const height = node.height ?? DEFAULT_NODE_HEIGHT

    minX = Math.min(minX, node.position.x)
    minY = Math.min(minY, node.position.y)
    maxX = Math.max(maxX, node.position.x + width)
    maxY = Math.max(maxY, node.position.y + height)
  })

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function createGroupFromNodes(
  selectedNodes: Node<BaseNodeData>[],
  groupId: string,
  groupLabel: string = 'New Group'
): {
  groupNode: Node<GroupNodeData>
  updatedChildren: Node<BaseNodeData>[]
} {
  const bounds = calculateNodesBounds(selectedNodes)

  // Create group node positioned around selected nodes
  const width = bounds.width + GROUP_PADDING * 2
  const height = bounds.height + GROUP_HEADER_HEIGHT + GROUP_PADDING

  const groupNode: Node<GroupNodeData> = {
    id: groupId,
    type: 'groupNode',
    position: {
      x: bounds.x - GROUP_PADDING,
      y: bounds.y - GROUP_HEADER_HEIGHT,
    },
    width,
    height,
    style: {
      width,
      height,
    },
    data: {
      label: groupLabel,
      isGroup: true,
    },
  }

  // Update children with relative positions
  const updatedChildren = selectedNodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x - groupNode.position.x,
      y: node.position.y - groupNode.position.y,
    },
    parentNode: groupId,
    extent: 'parent' as const,
    expandParent: true,
  }))

  return { groupNode, updatedChildren }
}

export function ungroupNodes(
  groupNode: Node<GroupNodeData>,
  children: Node<BaseNodeData>[]
): Node<BaseNodeData>[] {
  // Convert children positions - if group has a parent, children become siblings of group
  // Otherwise they become root nodes
  const groupParent = groupNode.parentNode

  return children.map((child) => {
    const newNode = { ...child }
    // Position is relative to group, add group position to get position relative to group's parent
    newNode.position = {
      x: groupNode.position.x + child.position.x,
      y: groupNode.position.y + child.position.y,
    }

    if (groupParent) {
      // Children move to the group's parent
      newNode.parentNode = groupParent
      newNode.extent = 'parent' as const
      newNode.expandParent = true
    } else {
      // Children become root nodes
      delete newNode.parentNode
      delete newNode.extent
      delete newNode.expandParent
    }
    return newNode
  })
}

export function assignNodeToGroup(
  node: Node<BaseNodeData>,
  groupNode: Node<GroupNodeData>
): Node<BaseNodeData> {
  return {
    ...node,
    position: {
      x: node.position.x - groupNode.position.x,
      y: node.position.y - groupNode.position.y,
    },
    parentNode: groupNode.id,
    extent: 'parent' as const,
    expandParent: true,
  }
}

export function removeNodeFromGroup(
  node: Node<BaseNodeData>,
  groupNode: Node<GroupNodeData>
): Node<BaseNodeData> {
  const newNode = { ...node }
  const groupParent = groupNode.parentNode

  // Position is relative to group, add group position to get position relative to group's parent
  newNode.position = {
    x: groupNode.position.x + node.position.x,
    y: groupNode.position.y + node.position.y,
  }

  if (groupParent) {
    // Node moves to the group's parent (becomes sibling of the group)
    newNode.parentNode = groupParent
    newNode.extent = 'parent' as const
    newNode.expandParent = true
  } else {
    // Node becomes root node
    delete newNode.parentNode
    delete newNode.extent
    delete newNode.expandParent
  }
  return newNode
}

export function findGroupAtPosition(
  position: { x: number; y: number },
  groups: Node<GroupNodeData>[],
  excludeId?: string
): Node<GroupNodeData> | null {
  // Find group that contains the position
  for (const group of groups) {
    if (excludeId && group.id === excludeId) continue

    const width = (group.style?.width as number) || 250
    const height = (group.style?.height as number) || 150

    if (
      position.x >= group.position.x &&
      position.x <= group.position.x + width &&
      position.y >= group.position.y &&
      position.y <= group.position.y + height
    ) {
      return group
    }
  }
  return null
}

export function isGroupNode(node: Node): node is Node<GroupNodeData> {
  return node.type === 'groupNode'
}

export function getGroupChildren(
  groupId: string,
  nodes: Node<BaseNodeData>[]
): Node<BaseNodeData>[] {
  return nodes.filter((node) => node.parentNode === groupId)
}

// Get all descendants recursively (children, grandchildren, etc.)
export function getAllDescendants(
  groupId: string,
  nodes: Node<BaseNodeData>[]
): Node<BaseNodeData>[] {
  const directChildren = getGroupChildren(groupId, nodes)
  const allDescendants = [...directChildren]

  for (const child of directChildren) {
    if (isGroupNode(child)) {
      allDescendants.push(...getAllDescendants(child.id, nodes))
    }
  }

  return allDescendants
}
