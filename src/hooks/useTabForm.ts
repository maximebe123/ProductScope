/**
 * useTabForm - Generic Form State Management for Tab Components
 *
 * Consolidates the repeated form management pattern found in project tabs:
 * - Form data state with initial values
 * - Edit/Create modal visibility
 * - Loading states (saving, deleting)
 * - Standard CRUD operations
 */

import { useState, useCallback, useMemo } from 'react'

/**
 * API interface expected by the hook.
 * Each entity API should implement these methods.
 */
export interface TabFormApi<T, TCreate, TUpdate = Partial<TCreate>> {
  create: (projectId: string, data: TCreate) => Promise<T>
  update: (projectId: string, id: string, data: TUpdate) => Promise<T>
  delete: (projectId: string, id: string) => Promise<void>
}

/**
 * Configuration for the useTabForm hook
 */
export interface UseTabFormConfig<TForm, TItem> {
  /** Initial form data when creating a new item */
  initialFormData: TForm
  /** Convert an existing item to form data for editing */
  itemToFormData: (item: TItem) => TForm
  /** Convert form data to API payload for create/update */
  formDataToPayload: (formData: TForm) => Record<string, unknown>
  /** Validate form data before submission (returns error message or null) */
  validate?: (formData: TForm) => string | null
  /** Confirm message for delete (optional, defaults to generic) */
  deleteConfirmMessage?: string | ((item: TItem) => string)
}

/**
 * Return type for useTabForm hook
 */
export interface UseTabFormReturn<TForm, TItem> {
  // State
  formData: TForm
  setFormData: React.Dispatch<React.SetStateAction<TForm>>
  showNewForm: boolean
  setShowNewForm: (show: boolean) => void
  editingItem: TItem | null
  saving: boolean
  deleting: string | null

  // Actions
  resetForm: () => void
  openCreateForm: () => void
  openEditForm: (item: TItem) => void
  closeForm: () => void
  handleSubmit: (e: React.FormEvent) => Promise<void>
  handleDelete: (itemId: string) => Promise<void>
  updateField: <K extends keyof TForm>(field: K, value: TForm[K]) => void

  // Computed
  isEditing: boolean
  isFormOpen: boolean
}

/**
 * Generic hook for managing form state in tab components.
 *
 * @example
 * const {
 *   formData,
 *   updateField,
 *   showNewForm,
 *   editingItem,
 *   openCreateForm,
 *   openEditForm,
 *   handleSubmit,
 *   handleDelete,
 * } = useTabForm({
 *   projectId,
 *   api: featureApi,
 *   onSuccess: onUpdate,
 *   config: {
 *     initialFormData: { title: '', description: '', priority: 'medium' },
 *     itemToFormData: (feature) => ({
 *       title: feature.title,
 *       description: feature.description || '',
 *       priority: feature.priority,
 *     }),
 *     formDataToPayload: (formData) => ({
 *       title: formData.title.trim(),
 *       description: formData.description.trim() || undefined,
 *       priority: formData.priority,
 *     }),
 *     validate: (formData) => formData.title.trim() ? null : 'Title is required',
 *   },
 * })
 */
export function useTabForm<
  TForm extends Record<string, unknown>,
  TItem extends { id: string },
  TCreate = Record<string, unknown>,
  TUpdate = Partial<TCreate>,
>({
  projectId,
  api,
  onSuccess,
  config,
}: {
  projectId: string
  api: TabFormApi<TItem, TCreate, TUpdate>
  onSuccess: () => void
  config: UseTabFormConfig<TForm, TItem>
}): UseTabFormReturn<TForm, TItem> {
  // Form state
  const [formData, setFormData] = useState<TForm>(config.initialFormData)
  const [showNewForm, setShowNewForm] = useState(false)
  const [editingItem, setEditingItem] = useState<TItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData(config.initialFormData)
  }, [config.initialFormData])

  // Open form for creating new item
  const openCreateForm = useCallback(() => {
    resetForm()
    setEditingItem(null)
    setShowNewForm(true)
  }, [resetForm])

  // Open form for editing existing item
  const openEditForm = useCallback((item: TItem) => {
    setFormData(config.itemToFormData(item))
    setEditingItem(item)
    setShowNewForm(false)
  }, [config])

  // Close form
  const closeForm = useCallback(() => {
    setShowNewForm(false)
    setEditingItem(null)
    resetForm()
  }, [resetForm])

  // Update a single form field
  const updateField = useCallback(<K extends keyof TForm>(field: K, value: TForm[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  // Handle form submission (create or update)
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate if validator provided
    if (config.validate) {
      const error = config.validate(formData)
      if (error) {
        alert(error)
        return
      }
    }

    try {
      setSaving(true)
      const payload = config.formDataToPayload(formData)

      if (editingItem) {
        await api.update(projectId, editingItem.id, payload as TUpdate)
        setEditingItem(null)
      } else {
        await api.create(projectId, payload as TCreate)
        setShowNewForm(false)
      }

      resetForm()
      onSuccess()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }, [formData, editingItem, projectId, api, config, resetForm, onSuccess])

  // Handle item deletion
  const handleDelete = useCallback(async (itemId: string) => {
    const message = typeof config.deleteConfirmMessage === 'function'
      ? config.deleteConfirmMessage(editingItem as TItem)
      : config.deleteConfirmMessage || 'Are you sure you want to delete this item?'

    if (!confirm(message)) return

    try {
      setDeleting(itemId)
      await api.delete(projectId, itemId)
      onSuccess()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setDeleting(null)
    }
  }, [projectId, api, onSuccess, config.deleteConfirmMessage, editingItem])

  // Computed values
  const isEditing = editingItem !== null
  const isFormOpen = showNewForm || isEditing

  return useMemo(() => ({
    // State
    formData,
    setFormData,
    showNewForm,
    setShowNewForm,
    editingItem,
    saving,
    deleting,

    // Actions
    resetForm,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    handleDelete,
    updateField,

    // Computed
    isEditing,
    isFormOpen,
  }), [
    formData,
    showNewForm,
    editingItem,
    saving,
    deleting,
    resetForm,
    openCreateForm,
    openEditForm,
    closeForm,
    handleSubmit,
    handleDelete,
    updateField,
    isEditing,
    isFormOpen,
  ])
}

/**
 * Helper type to extract form field update function signature
 */
export type FormFieldUpdater<TForm> = <K extends keyof TForm>(field: K, value: TForm[K]) => void

/**
 * Creates a typed onChange handler for input elements
 */
export function createInputHandler<TForm>(
  updateField: FormFieldUpdater<TForm>,
  field: keyof TForm,
) {
  return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    updateField(field, e.target.value as TForm[typeof field])
  }
}
