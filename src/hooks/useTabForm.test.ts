/**
 * useTabForm Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTabForm, type TabFormApi } from './useTabForm'

interface TestItem {
  id: string
  title: string
  description: string
}

interface TestFormData {
  title: string
  description: string
}

const initialFormData: TestFormData = {
  title: '',
  description: '',
}

const mockApi: TabFormApi<TestItem, TestFormData> = {
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockOnSuccess = vi.fn()

const hookConfig = {
  projectId: 'project-1',
  api: mockApi,
  onSuccess: mockOnSuccess,
  config: {
    initialFormData,
    itemToFormData: (item: TestItem) => ({
      title: item.title,
      description: item.description,
    }),
    formDataToPayload: (data: TestFormData) => ({
      title: data.title.trim(),
      description: data.description.trim() || undefined,
    }),
    validate: (data: TestFormData) =>
      data.title.trim() ? null : 'Title is required',
  },
}

describe('useTabForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useTabForm(hookConfig))

    expect(result.current.formData).toEqual(initialFormData)
    expect(result.current.showNewForm).toBe(false)
    expect(result.current.editingItem).toBeNull()
    expect(result.current.saving).toBe(false)
    expect(result.current.isEditing).toBe(false)
    expect(result.current.isFormOpen).toBe(false)
  })

  it('should open create form correctly', () => {
    const { result } = renderHook(() => useTabForm(hookConfig))

    act(() => {
      result.current.openCreateForm()
    })

    expect(result.current.showNewForm).toBe(true)
    expect(result.current.isFormOpen).toBe(true)
    expect(result.current.isEditing).toBe(false)
  })

  it('should open edit form with item data', () => {
    const { result } = renderHook(() => useTabForm(hookConfig))

    const testItem: TestItem = {
      id: 'item-1',
      title: 'Test Title',
      description: 'Test Description',
    }

    act(() => {
      result.current.openEditForm(testItem)
    })

    expect(result.current.editingItem).toEqual(testItem)
    expect(result.current.formData.title).toBe('Test Title')
    expect(result.current.formData.description).toBe('Test Description')
    expect(result.current.isEditing).toBe(true)
    expect(result.current.isFormOpen).toBe(true)
  })

  it('should update field correctly', () => {
    const { result } = renderHook(() => useTabForm(hookConfig))

    act(() => {
      result.current.updateField('title', 'New Title')
    })

    expect(result.current.formData.title).toBe('New Title')
  })

  it('should close form and reset data', () => {
    const { result } = renderHook(() => useTabForm(hookConfig))

    act(() => {
      result.current.openCreateForm()
      result.current.updateField('title', 'Some Title')
    })

    expect(result.current.showNewForm).toBe(true)
    expect(result.current.formData.title).toBe('Some Title')

    act(() => {
      result.current.closeForm()
    })

    expect(result.current.showNewForm).toBe(false)
    expect(result.current.formData).toEqual(initialFormData)
  })

  it('should validate form data on submit', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const { result } = renderHook(() => useTabForm(hookConfig))

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent)
    })

    expect(alertMock).toHaveBeenCalledWith('Title is required')
    expect(mockApi.create).not.toHaveBeenCalled()

    alertMock.mockRestore()
  })

  it('should call create API for new items', async () => {
    const { result } = renderHook(() => useTabForm(hookConfig))

    ;(mockApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'new-item',
      title: 'New Item',
      description: 'Description',
    })

    act(() => {
      result.current.openCreateForm()
      result.current.updateField('title', 'New Item')
      result.current.updateField('description', 'Description')
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent)
    })

    expect(mockApi.create).toHaveBeenCalledWith('project-1', {
      title: 'New Item',
      description: 'Description',
    })
    expect(mockOnSuccess).toHaveBeenCalled()
  })

  it('should call update API for existing items', async () => {
    const { result } = renderHook(() => useTabForm(hookConfig))

    const existingItem: TestItem = {
      id: 'item-1',
      title: 'Old Title',
      description: 'Old Description',
    }

    ;(mockApi.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...existingItem,
      title: 'Updated Title',
    })

    act(() => {
      result.current.openEditForm(existingItem)
      result.current.updateField('title', 'Updated Title')
    })

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent)
    })

    expect(mockApi.update).toHaveBeenCalledWith('project-1', 'item-1', {
      title: 'Updated Title',
      description: 'Old Description',
    })
    expect(mockOnSuccess).toHaveBeenCalled()
  })
})
