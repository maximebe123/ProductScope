import { Node, Edge } from 'reactflow'
import { toPng, toSvg } from 'html-to-image'
import { saveAs } from 'file-saver'
import { BaseNodeData } from '../../modules/diagrams/components/Nodes/BaseNode'
import { nodeTypes } from '../../modules/diagrams/config/nodeConfig'

export interface DiagramExport {
  version: string
  name: string
  exportedAt: string
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    style?: { width?: number; height?: number }
    data: {
      label: string
      nodeType?: string
      tags?: string[]
      isGroup?: boolean
      volumes?: Array<{ name: string; mountPath: string }>
    }
    // Parent-child relationship
    parentNode?: string
    extent?: 'parent' | string
    expandParent?: boolean
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
    data?: {
      colorFromTarget?: boolean
      label?: string
    }
  }>
}

const EXPORT_VERSION = '1.0'

export function exportToJSON(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  name: string = 'diagram'
): void {
  const exportData: DiagramExport = {
    version: EXPORT_VERSION,
    name,
    exportedAt: new Date().toISOString(),
    nodes: nodes.map((node) => {
      const exportNode: DiagramExport['nodes'][0] = {
        id: node.id,
        type: node.type || 'customNode',
        position: node.position,
        data: {
          label: node.data.label,
          nodeType: node.data.nodeType,
          tags: node.data.tags,
          isGroup: node.data.isGroup,
          volumes: node.data.volumes,
        },
      }

      // Include style for group nodes
      if (node.style) {
        exportNode.style = {
          width: node.style.width as number | undefined,
          height: node.style.height as number | undefined,
        }
      }

      // Include parent-child relationship
      if (node.parentNode) {
        exportNode.parentNode = node.parentNode
        exportNode.extent = node.extent as 'parent' | string | undefined
        exportNode.expandParent = node.expandParent
      }

      return exportNode
    }),
    edges: edges.map((edge) => {
      const edgeData: DiagramExport['edges'][0]['data'] = {}
      if (edge.data?.colorFromTarget) edgeData.colorFromTarget = true
      if (edge.data?.label) edgeData.label = edge.data.label
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        data: Object.keys(edgeData).length > 0 ? edgeData : undefined,
      }
    }),
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  })
  saveAs(blob, `${name}.json`)
}

export function exportToMarkdown(
  nodes: Node<BaseNodeData>[],
  edges: Edge[],
  name: string = 'diagram'
): void {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const groupNodes = nodes.filter((n) => n.type === 'groupNode')
  const regularNodes = nodes.filter((n) => n.type !== 'groupNode')

  let markdown = `# ${name}\n\n`
  markdown += `*Exported on ${new Date().toLocaleDateString()}*\n\n`

  // Groups section
  if (groupNodes.length > 0) {
    markdown += `## Groups\n\n`
    groupNodes.forEach((group) => {
      const children = regularNodes.filter((n) => n.parentNode === group.id)
      markdown += `### ${group.data.label}\n\n`
      if (children.length > 0) {
        markdown += `Contains:\n`
        children.forEach((child) => {
          const config = nodeTypes[child.data.nodeType]
          const typeName = config?.label || child.data.nodeType
          markdown += `- ${child.data.label} (${typeName})\n`
        })
      } else {
        markdown += `*Empty group*\n`
      }
      markdown += `\n`
    })
  }

  // Nodes table
  markdown += `## Nodes\n\n`
  markdown += `| ID | Type | Label | Tags | Parent |\n`
  markdown += `|----|------|-------|------|--------|\n`

  regularNodes.forEach((node) => {
    const config = nodeTypes[node.data.nodeType]
    const typeName = config?.label || node.data.nodeType
    const tags = node.data.tags?.join(', ') || '-'
    const parent = node.parentNode ? nodeMap.get(node.parentNode)?.data.label || node.parentNode : '-'
    markdown += `| ${node.id} | ${typeName} | ${node.data.label} | ${tags} | ${parent} |\n`
  })

  // Connections
  markdown += `\n## Connections\n\n`

  if (edges.length === 0) {
    markdown += `*No connections*\n`
  } else {
    edges.forEach((edge) => {
      const sourceNode = nodeMap.get(edge.source)
      const targetNode = nodeMap.get(edge.target)
      const sourceName = sourceNode?.data.label || edge.source
      const targetName = targetNode?.data.label || edge.target
      const edgeLabel = edge.data?.label ? ` [${edge.data.label}]` : ''
      markdown += `- ${sourceName} → ${targetName}${edgeLabel}\n`
    })
  }

  const blob = new Blob([markdown], { type: 'text/markdown' })
  saveAs(blob, `${name}.md`)
}

export interface ExportOptions {
  transparent?: boolean
}

export async function exportToPNG(
  element: HTMLElement,
  name: string = 'diagram',
  options: ExportOptions = {}
): Promise<void> {
  try {
    const dataUrl = await toPng(element, {
      backgroundColor: options.transparent ? undefined : '#f9fafb',
      pixelRatio: 2,
      filter: (node) => {
        // Exclude controls and minimap from export
        if (node.classList) {
          return (
            !node.classList.contains('react-flow__controls') &&
            !node.classList.contains('react-flow__minimap') &&
            !node.classList.contains('react-flow__panel')
          )
        }
        return true
      },
    })

    const link = document.createElement('a')
    link.download = `${name}.png`
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('Error exporting to PNG:', error)
    throw error
  }
}

export async function exportToSVG(
  element: HTMLElement,
  name: string = 'diagram'
): Promise<void> {
  try {
    const dataUrl = await toSvg(element, {
      backgroundColor: '#f9fafb',
      filter: (node) => {
        // Exclude controls and minimap from export
        if (node.classList) {
          return (
            !node.classList.contains('react-flow__controls') &&
            !node.classList.contains('react-flow__minimap') &&
            !node.classList.contains('react-flow__panel')
          )
        }
        return true
      },
    })

    const link = document.createElement('a')
    link.download = `${name}.svg`
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('Error exporting to SVG:', error)
    throw error
  }
}

export function getExportFilename(baseName: string = 'rdiagram'): string {
  const date = new Date()
  const dateStr = date.toISOString().split('T')[0]
  return `${baseName}_${dateStr}`
}
