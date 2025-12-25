import { Node } from 'reactflow'

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'
export type DistributionType = 'horizontal' | 'vertical'

interface NodeBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  centerX: number
  centerY: number
}

const DEFAULT_NODE_WIDTH = 180
const DEFAULT_NODE_HEIGHT = 80

function getNodeDimensions(node: Node): { width: number; height: number } {
  return {
    width: node.width ?? DEFAULT_NODE_WIDTH,
    height: node.height ?? DEFAULT_NODE_HEIGHT,
  }
}

function getSelectionBounds(nodes: Node[]): NodeBounds {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0 }
  }

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  nodes.forEach((node) => {
    const { width, height } = getNodeDimensions(node)
    minX = Math.min(minX, node.position.x)
    maxX = Math.max(maxX, node.position.x + width)
    minY = Math.min(minY, node.position.y)
    maxY = Math.max(maxY, node.position.y + height)
  })

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

export function alignNodes(nodes: Node[], alignType: AlignmentType): Node[] {
  if (nodes.length < 2) return nodes

  const bounds = getSelectionBounds(nodes)

  return nodes.map((node) => {
    const { width, height } = getNodeDimensions(node)
    const newPosition = { ...node.position }

    switch (alignType) {
      case 'left':
        newPosition.x = bounds.minX
        break
      case 'center':
        newPosition.x = bounds.centerX - width / 2
        break
      case 'right':
        newPosition.x = bounds.maxX - width
        break
      case 'top':
        newPosition.y = bounds.minY
        break
      case 'middle':
        newPosition.y = bounds.centerY - height / 2
        break
      case 'bottom':
        newPosition.y = bounds.maxY - height
        break
    }

    return {
      ...node,
      position: newPosition,
    }
  })
}

export function distributeNodes(nodes: Node[], distribution: DistributionType): Node[] {
  if (nodes.length < 3) return nodes

  const sortedNodes = [...nodes].sort((a, b) => {
    if (distribution === 'horizontal') {
      return a.position.x - b.position.x
    }
    return a.position.y - b.position.y
  })

  const first = sortedNodes[0]
  const last = sortedNodes[sortedNodes.length - 1]

  if (distribution === 'horizontal') {
    const firstDim = getNodeDimensions(first)
    const lastDim = getNodeDimensions(last)
    const totalWidth = (last.position.x + lastDim.width) - first.position.x

    // Calculate total width of all nodes except first and last
    let nodesWidth = 0
    sortedNodes.slice(1, -1).forEach((node) => {
      nodesWidth += getNodeDimensions(node).width
    })

    // Available space for gaps
    const availableSpace = totalWidth - firstDim.width - lastDim.width - nodesWidth
    const gap = availableSpace / (sortedNodes.length - 1)

    let currentX = first.position.x + firstDim.width + gap

    return sortedNodes.map((node, index) => {
      if (index === 0 || index === sortedNodes.length - 1) {
        return node
      }
      const newNode = {
        ...node,
        position: { ...node.position, x: currentX },
      }
      currentX += getNodeDimensions(node).width + gap
      return newNode
    })
  } else {
    const firstDim = getNodeDimensions(first)
    const lastDim = getNodeDimensions(last)
    const totalHeight = (last.position.y + lastDim.height) - first.position.y

    // Calculate total height of all nodes except first and last
    let nodesHeight = 0
    sortedNodes.slice(1, -1).forEach((node) => {
      nodesHeight += getNodeDimensions(node).height
    })

    // Available space for gaps
    const availableSpace = totalHeight - firstDim.height - lastDim.height - nodesHeight
    const gap = availableSpace / (sortedNodes.length - 1)

    let currentY = first.position.y + firstDim.height + gap

    return sortedNodes.map((node, index) => {
      if (index === 0 || index === sortedNodes.length - 1) {
        return node
      }
      const newNode = {
        ...node,
        position: { ...node.position, y: currentY },
      }
      currentY += getNodeDimensions(node).height + gap
      return newNode
    })
  }
}

export function getSelectionCenter(nodes: Node[]): { x: number; y: number } {
  const bounds = getSelectionBounds(nodes)
  return {
    x: bounds.centerX,
    y: bounds.minY - 60, // Position toolbar above selection
  }
}
