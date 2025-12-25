/**
 * Generic Tab State Hook
 * Consolidates common state management patterns across all project tabs
 * (Features, Stories, KPIs, Decisions, Questions, UserJourneys)
 */

import { useState, useCallback } from 'react'

export interface UseTabStateOptions<TEntity, TFormData> {
  /** Initial form data values */
  initialFormData: TFormData
  /** Convert entity to form data for editing */
  entityToFormData: (entity: TEntity) => TFormData
  /** API methods for CRUD operations */
  api: {
    create: (projectId: string, data: Partial<TFormData>) => Promise<TEntity>
    update: (projectId: string, entityId: string, data: Partial<TFormData>) => Promise<TEntity>
    delete: (projectId: string, entityId: string) => Promise<void>
  }
  /** Extract ID from entity */
  getEntityId: (entity: TEntity) => string
  /** Transform form data before sending to API */
  transformFormData?: (formData: TFormData, isUpdate: boolean) => Record<string, unknown>
}

export interface UseTabStateReturn<TEntity, TFormData, TStatus extends string> {
  // Modal/Form visibility
  showNew: boolean
  setShowNew: (show: boolean) => void
  editing: TEntity | null
  setEditing: (entity: TEntity | null) => void

  // Filter states
  filterStatus: TStatus | 'all'
  setFilterStatus: (status: TStatus | 'all') => void

  // Expansion state
  expanded: string | null
  setExpanded: (id: string | null) => void
  toggleExpanded: (id: string) => void

  // Form state
  formData: TFormData
  updateFormField: <K extends keyof TFormData>(field: K, value: TFormData[K]) => void
  setFormData: React.Dispatch<React.SetStateAction<TFormData>>

  // Operations
  saving: boolean
  openEditModal: (entity: TEntity) => void
  resetForm: () => void
  closeModal: () => void
  handleSubmit: (e: React.FormEvent, projectId: string, onSuccess: () => void) => Promise<void>
  handleDelete: (projectId: string, entityId: string, onSuccess: () => void) => Promise<void>
  handleStatusChange: (
    projectId: string,
    entityId: string,
    status: TStatus,
    onSuccess: () => void
  ) => Promise<void>
}

export function useTabState<
  TEntity,
  TFormData extends Record<string, unknown>,
  TStatus extends string = string
>(
  options: UseTabStateOptions<TEntity, TFormData>
): UseTabStateReturn<TEntity, TFormData, TStatus> {
  const { initialFormData, entityToFormData, api, getEntityId, transformFormData } = options

  // Modal/Form visibility
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<TEntity | null>(null)

  // Filter state
  const [filterStatus, setFilterStatus] = useState<TStatus | 'all'>('all')

  // Expansion state
  const [expanded, setExpanded] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState<TFormData>(initialFormData)
  const [saving, setSaving] = useState(false)

  // Toggle expansion
  const toggleExpanded = useCallback((id: string) => {
    setExpanded(prev => (prev === id ? null : id))
  }, [])

  // Update single form field
  const updateFormField = useCallback(<K extends keyof TFormData>(field: K, value: TFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setFormData(initialFormData)
  }, [initialFormData])

  // Open edit modal with entity data
  const openEditModal = useCallback((entity: TEntity) => {
    setEditing(entity)
    setFormData(entityToFormData(entity))
  }, [entityToFormData])

  // Close modal (either new or edit)
  const closeModal = useCallback(() => {
    setShowNew(false)
    setEditing(null)
    resetForm()
  }, [resetForm])

  // Handle form submission (create or update)
  const handleSubmit = useCallback(async (
    e: React.FormEvent,
    projectId: string,
    onSuccess: () => void
  ) => {
    e.preventDefault()

    try {
      setSaving(true)
      const data = transformFormData
        ? transformFormData(formData, !!editing)
        : (formData as unknown as Partial<TFormData>)

      if (editing) {
        await api.update(projectId, getEntityId(editing), data as Partial<TFormData>)
        setEditing(null)
      } else {
        await api.create(projectId, data as Partial<TFormData>)
        setShowNew(false)
      }

      resetForm()
      onSuccess()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [formData, editing, api, getEntityId, resetForm, transformFormData])

  // Handle delete
  const handleDelete = useCallback(async (
    projectId: string,
    entityId: string,
    onSuccess: () => void
  ) => {
    if (!confirm('Delete this item?')) return

    try {
      await api.delete(projectId, entityId)
      onSuccess()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    }
  }, [api])

  // Handle status change
  const handleStatusChange = useCallback(async (
    projectId: string,
    entityId: string,
    status: TStatus,
    onSuccess: () => void
  ) => {
    try {
      await api.update(projectId, entityId, { status } as unknown as Partial<TFormData>)
      onSuccess()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status')
    }
  }, [api])

  return {
    // Modal/Form visibility
    showNew,
    setShowNew,
    editing,
    setEditing,

    // Filter states
    filterStatus,
    setFilterStatus,

    // Expansion state
    expanded,
    setExpanded,
    toggleExpanded,

    // Form state
    formData,
    updateFormField,
    setFormData,

    // Operations
    saving,
    openEditModal,
    resetForm,
    closeModal,
    handleSubmit,
    handleDelete,
    handleStatusChange,
  }
}

/**
 * Helper type for filter arrays
 */
export function filterByStatus<T extends { status: string }, S extends string>(
  items: T[],
  filterStatus: S | 'all'
): T[] {
  if (filterStatus === 'all') return items
  return items.filter(item => item.status === filterStatus)
}

/**
 * Helper to parse tags from comma-separated string
 */
export function parseTags(tagsString: string): string[] {
  return tagsString
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
}
