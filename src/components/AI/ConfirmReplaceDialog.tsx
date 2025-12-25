/**
 * Confirmation dialog for replacing existing diagram
 */

import { AlertTriangle } from 'lucide-react'

interface ConfirmReplaceDialogProps {
  isOpen: boolean
  nodeCount: number
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmReplaceDialog({
  isOpen,
  nodeCount,
  onConfirm,
  onCancel,
}: ConfirmReplaceDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="text-yellow-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Replace existing diagram?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Your current diagram has{' '}
                <span className="font-medium">{nodeCount} nodes</span>. Generating a
                new diagram will replace all existing content.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                This action cannot be undone. Consider exporting your current diagram
                first.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            Replace diagram
          </button>
        </div>
      </div>
    </div>
  )
}
