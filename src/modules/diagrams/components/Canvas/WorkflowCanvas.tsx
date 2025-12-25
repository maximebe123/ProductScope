import { useCallback, useRef, useState, useMemo, useEffect, DragEvent, MouseEvent as ReactMouseEvent } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Panel,
  ReactFlowInstance,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  EdgeTypes,
  NodeDragHandler,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { customNodeTypes } from '../Nodes/nodeTypes'
import { NodeTypeId } from '../../config/nodeConfig'
import { BaseNodeData } from '../Nodes/BaseNode'
import { GroupNodeData } from '../Nodes/GroupNode'
import CustomEdge from '../Edges/CustomEdge'
import AlignmentToolbar from '../Toolbar/AlignmentToolbar'
import ExportMenu from '../Toolbar/ExportMenu'
import ContextMenu from '../ContextMenu/ContextMenu'
import { findGroupAtPosition, isGroupNode } from '../../utils/groupingUtils'

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

const GRID_SIZE = 24
const SNAP_STORAGE_KEY = 'rdiagrams-snap-to-grid'

interface ContextMenuState {
  x: number
  y: number
  show: boolean
}

interface WorkflowCanvasProps {
  nodes: Node<BaseNodeData>[]
  edges: Edge[]
  onNodesChange: OnNodesChange
  onEdgesChange: OnEdgesChange
  onConnect: OnConnect
  onSelectionChange: (params: { nodes: Node<BaseNodeData>[]; edges: Edge[] }) => void
  addNode: (nodeTypeId: NodeTypeId, position: { x: number; y: number }) => void
  updateNodeLabel: (nodeId: string, newLabel: string) => void
  deleteSelected: () => void
  loadDiagram: (nodes: Node<BaseNodeData>[], edges: Edge[]) => void
  // Group operations
  createGroup: (nodeIds: string[], label?: string) => void
  ungroup: (groupId: string) => void
  addNodeToGroup: (nodeId: string, groupId: string) => void
  removeFromGroup: (nodeId: string) => void
  getGroups: () => Node<GroupNodeData>[]
  // Auto-save status
  lastSaved?: Date | null
  hasUnsavedChanges?: boolean
  // History operations
  undo?: () => void
  redo?: () => void
  canUndo?: boolean
  canRedo?: boolean
  // Clipboard operations
  copySelectedNodes?: () => void
  pasteNodes?: () => void
  duplicateSelectedNodes?: () => void
  selectAll?: () => void
  deselectAll?: () => void
  moveSelectedNodes?: (dx: number, dy: number) => void
  onInstanceReady?: (instance: ReactFlowInstance) => void
}

const WorkflowCanvas = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelectionChange,
  addNode,
  updateNodeLabel,
  deleteSelected,
  loadDiagram,
  createGroup,
  ungroup,
  addNodeToGroup,
  removeFromGroup,
  getGroups,
  lastSaved,
  hasUnsavedChanges,
  undo,
  redo,
  canUndo,
  canRedo,
  copySelectedNodes,
  pasteNodes,
  duplicateSelectedNodes,
  selectAll,
  deselectAll,
  moveSelectedNodes,
  onInstanceReady,
}: WorkflowCanvasProps) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedNodes, setSelectedNodes] = useState<Node<BaseNodeData>[]>([])
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, show: false })
  const [snapToGrid, setSnapToGrid] = useState(() => {
    const stored = localStorage.getItem(SNAP_STORAGE_KEY)
    return stored !== null ? stored === 'true' : true
  })

  useEffect(() => {
    localStorage.setItem(SNAP_STORAGE_KEY, String(snapToGrid))
  }, [snapToGrid])

  const toggleSnapToGrid = useCallback(() => {
    setSnapToGrid((prev) => !prev)
  }, [])

  const handleSelectionChange = useCallback(
    (params: { nodes: Node<BaseNodeData>[]; edges: Edge[] }) => {
      setSelectedNodes(params.nodes)
      onSelectionChange(params)
    },
    [onSelectionChange]
  )

  // Context menu handlers
  const handleContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      event.preventDefault()
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        show: true,
      })
    },
    []
  )

  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, show: false }))
  }, [])

  const handleGroup = useCallback(() => {
    const nodeIds = selectedNodes.map((n) => n.id)
    createGroup(nodeIds, 'New Group')
  }, [selectedNodes, createGroup])

  // Drag & drop on group
  const handleNodeDragStop: NodeDragHandler = useCallback(
    (_event, node) => {
      // Skip if node is already in a group or is a group itself
      if (node.parentNode || isGroupNode(node)) return

      // Get absolute position
      const groups = getGroups()
      const targetGroup = findGroupAtPosition(node.position, groups, node.id)

      if (targetGroup) {
        addNodeToGroup(node.id, targetGroup.id)
      }
    },
    [getGroups, addNodeToGroup]
  )

  const onInit = useCallback((instance: ReactFlowInstance) => {
    reactFlowInstance.current = instance
    onInstanceReady?.(instance)
  }, [onInstanceReady])

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }, [])

  const onDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
      setIsDragOver(false)

      const nodeTypeId = event.dataTransfer.getData('application/reactflow') as NodeTypeId
      if (!nodeTypeId || !reactFlowInstance.current || !reactFlowWrapper.current) {
        return
      }

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNode(nodeTypeId, position)
    },
    [addNode]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey

      // Delete selected nodes/edges
      if (event.key === 'Backspace' || event.key === 'Delete') {
        deleteSelected()
        return
      }

      // Escape - deselect all
      if (event.key === 'Escape') {
        deselectAll?.()
        return
      }

      // Cmd/Ctrl + Z - Undo
      if (isMeta && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo?.()
        return
      }

      // Cmd/Ctrl + Shift + Z - Redo
      if (isMeta && event.key === 'z' && event.shiftKey) {
        event.preventDefault()
        redo?.()
        return
      }

      // Cmd/Ctrl + C - Copy
      if (isMeta && event.key === 'c') {
        event.preventDefault()
        copySelectedNodes?.()
        return
      }

      // Cmd/Ctrl + V - Paste
      if (isMeta && event.key === 'v') {
        event.preventDefault()
        pasteNodes?.()
        return
      }

      // Cmd/Ctrl + D - Duplicate
      if (isMeta && event.key === 'd') {
        event.preventDefault()
        duplicateSelectedNodes?.()
        return
      }

      // Cmd/Ctrl + A - Select All
      if (isMeta && event.key === 'a') {
        event.preventDefault()
        selectAll?.()
        return
      }

      // Cmd/Ctrl + G - Group
      if (isMeta && event.key === 'g') {
        event.preventDefault()
        if (selectedNodes.length >= 2) {
          const nodeIds = selectedNodes.map((n) => n.id)
          createGroup(nodeIds, 'New Group')
        }
        return
      }

      // Arrow keys - move selected nodes
      const moveAmount = GRID_SIZE
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        moveSelectedNodes?.(0, -moveAmount)
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        moveSelectedNodes?.(0, moveAmount)
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        moveSelectedNodes?.(-moveAmount, 0)
        return
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        moveSelectedNodes?.(moveAmount, 0)
        return
      }
    },
    [deleteSelected, deselectAll, undo, redo, copySelectedNodes, pasteNodes, duplicateSelectedNodes, selectAll, selectedNodes, createGroup, moveSelectedNodes]
  )

  const nodesWithCallbacks = nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      onLabelChange: updateNodeLabel,
    },
  }))

  // Add source and target node types to edges for coloring
  const edgesWithData = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    return edges.map((edge) => {
      const sourceNode = nodeMap.get(edge.source)
      const targetNode = nodeMap.get(edge.target)
      return {
        ...edge,
        type: 'custom',
        data: {
          ...edge.data,
          sourceNodeType: sourceNode?.data.nodeType,
          targetNodeType: targetNode?.data.nodeType,
        },
      }
    })
  }, [edges, nodes])

  return (
    <div
      ref={reactFlowWrapper}
      className={`flex-1 h-full transition-all duration-200 ${isDragOver ? 'canvas-drop-active' : ''}`}
      onKeyDown={handleKeyDown}
      onDragLeave={onDragLeave}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edgesWithData}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={onInit}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onSelectionChange={handleSelectionChange}
        onNodeDragStop={handleNodeDragStop}
        onContextMenu={handleContextMenu}
        nodeTypes={customNodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: 'custom',
        }}
        snapToGrid={snapToGrid}
        snapGrid={[GRID_SIZE, GRID_SIZE]}
        fitView
        selectNodesOnDrag={false}
        className="bg-gray-50"
      >
        <Background color="#cbd5e1" gap={GRID_SIZE} size={1} />
        <Controls className="bg-white border border-gray-200 rounded-lg shadow-sm" />
        <Panel position="bottom-center">
          <ExportMenu
            nodes={nodes}
            edges={edges}
            canvasRef={reactFlowWrapper}
            onImport={loadDiagram}
            lastSaved={lastSaved}
            hasUnsavedChanges={hasUnsavedChanges}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            snapToGrid={snapToGrid}
            onToggleSnap={toggleSnapToGrid}
          />
        </Panel>
      </ReactFlow>
      <AlignmentToolbar selectedNodes={selectedNodes} />
      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedNodes={selectedNodes}
          onClose={closeContextMenu}
          onGroup={handleGroup}
          onUngroup={ungroup}
          onDelete={deleteSelected}
          onRemoveFromGroup={removeFromGroup}
        />
      )}
    </div>
  )
}

export default WorkflowCanvas
