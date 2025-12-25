/**
 * Mind Map Workflow Hook (MindElixir version)
 * Simplified hook that works with MindElixir's native capabilities
 */

import { useCallback, useState, useRef } from 'react'

import type { MindElixirData, MindElixirInstance, NodeObj } from '../types/mindElixir'
import { NOTE_STYLE } from '../types/mindElixir'
import {
  convertMindElixirToFlat,
  convertFlatToMindElixir,
  mergeChangesIntoMindElixir,
  createNewMindMap,
  migrateData,
  generateId,
} from '../utils/dataConverters'
import type { MindMapNode, MindMapEdge } from '../types/mindmap'

export function useMindMapWorkflow() {
  // MindElixir instance reference
  const mindInstanceRef = useRef<MindElixirInstance | null>(null)

  // State
  const [selectedNode, setSelectedNode] = useState<NodeObj | null>(null)
  const [data, setData] = useState<MindElixirData | null>(null)

  // Set the MindElixir instance (called from canvas)
  const setInstance = useCallback((instance: MindElixirInstance) => {
    mindInstanceRef.current = instance
  }, [])

  // Handle data changes from canvas
  const handleDataChange = useCallback((newData: MindElixirData) => {
    setData(newData)
  }, [])

  // Handle node selection from canvas
  const handleNodeSelect = useCallback((node: NodeObj | null) => {
    setSelectedNode(node)
  }, [])

  // Get current data
  const getData = useCallback((): MindElixirData | null => {
    return mindInstanceRef.current?.getData() ?? data
  }, [data])

  // Load data into the mind map
  const loadData = useCallback((newData: MindElixirData) => {
    if (mindInstanceRef.current) {
      mindInstanceRef.current.refresh(newData)
      setData(newData)
    }
  }, [])

  // Add a child node to the selected node
  const addChildNode = useCallback(() => {
    if (!mindInstanceRef.current?.currentNode) return
    mindInstanceRef.current.addChild()
  }, [])

  // Add a sibling node after the selected node
  const addSiblingNode = useCallback(() => {
    if (!mindInstanceRef.current?.currentNode) return
    mindInstanceRef.current.insertSibling('after')
  }, [])

  // Add a note node (styled differently)
  const addNoteNode = useCallback(() => {
    if (!mindInstanceRef.current?.currentNode) return
    mindInstanceRef.current.addChild(mindInstanceRef.current.currentNode, {
      id: generateId(),
      topic: 'Note',
      style: NOTE_STYLE,
    })
  }, [])

  // Delete the selected node(s)
  const deleteNode = useCallback(() => {
    if (!mindInstanceRef.current?.currentNodes?.length) return
    mindInstanceRef.current.removeNodes(mindInstanceRef.current.currentNodes)
  }, [])

  // Start editing the current node
  const startEditing = useCallback(() => {
    if (!mindInstanceRef.current?.currentNode) return
    mindInstanceRef.current.beginEdit()
  }, [])

  // Undo
  const undo = useCallback(() => {
    mindInstanceRef.current?.undo()
  }, [])

  // Redo
  const redo = useCallback(() => {
    mindInstanceRef.current?.redo()
  }, [])

  // Export to PNG
  const exportPng = useCallback(async (): Promise<Blob | null> => {
    if (!mindInstanceRef.current) return null
    return mindInstanceRef.current.exportPng()
  }, [])

  // Export to SVG
  const exportSvg = useCallback((): Blob | null => {
    if (!mindInstanceRef.current) return null
    return mindInstanceRef.current.exportSvg()
  }, [])

  // Center the view
  const centerView = useCallback(() => {
    mindInstanceRef.current?.toCenter()
  }, [])

  // Scale to fit
  const fitView = useCallback(() => {
    mindInstanceRef.current?.scaleFit()
  }, [])

  // --- AI Integration ---

  // Get nodes and edges for AI (flat format)
  const getNodesAndEdges = useCallback((): { nodes: MindMapNode[]; edges: MindMapEdge[] } => {
    const currentData = getData()
    if (!currentData) return { nodes: [], edges: [] }
    return convertMindElixirToFlat(currentData)
  }, [getData])

  // Load from AI (flat format)
  const loadFromAI = useCallback(
    (nodes: MindMapNode[], edges: MindMapEdge[]) => {
      const mindElixirData = convertFlatToMindElixir(nodes, edges)
      loadData(mindElixirData)
    },
    [loadData]
  )

  // Merge AI changes into current data
  const mergeMindMapChanges = useCallback(
    (changes: {
      nodes_to_add?: Array<{ id: string; parentId: string; label: string; nodeType: string }>
      nodes_to_modify?: Array<{ id: string; label?: string }>
      nodes_to_delete?: string[]
    }) => {
      const currentData = getData()
      if (!currentData) return

      const newData = mergeChangesIntoMindElixir(currentData, changes)
      loadData(newData)
    },
    [getData, loadData]
  )

  // Load diagram (for backwards compatibility with App.tsx)
  const loadDiagram = useCallback(
    (nodes: MindMapNode[], edges: MindMapEdge[]) => {
      loadFromAI(nodes, edges)
    },
    [loadFromAI]
  )

  // --- Auto-save integration ---

  // Get initial data (for auto-save restore)
  const getInitialData = useCallback((savedData: unknown): MindElixirData => {
    const migrated = migrateData(savedData)
    return migrated || createNewMindMap('Central Topic')
  }, [])

  return {
    // Instance management
    setInstance,
    mindInstance: mindInstanceRef.current,

    // State
    selectedNode,
    data,

    // Event handlers (pass to canvas)
    handleDataChange,
    handleNodeSelect,

    // Data operations
    getData,
    loadData,
    getInitialData,

    // Node operations (most are native via keyboard, but available programmatically)
    addChildNode,
    addSiblingNode,
    addNoteNode,
    deleteNode,
    startEditing,

    // History
    undo,
    redo,

    // View operations
    centerView,
    fitView,

    // Export
    exportPng,
    exportSvg,

    // AI integration
    getNodesAndEdges,
    loadFromAI,
    mergeMindMapChanges,
    loadDiagram,
  }
}
