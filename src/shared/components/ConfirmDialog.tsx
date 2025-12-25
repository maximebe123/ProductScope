/**
 * Confirm Dialog Component
 * Reusable confirmation dialog with glow effect based on type
 */

import { memo } from 'react'
import ModalLayout from './ModalLayout'

type DialogType = 'warning' | 'danger' | 'info' | 'success'

interface ConfirmDialogProps {
  isOpen: boolean
  type?: DialogType
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

// Glow colors based on type
const glowStyles: Record<DialogType, string> = {
  warning: 'shadow-[0_0_30px_rgba(251,191,36,0.4)]',  // amber-400
  danger: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]',   // red-500
  info: 'shadow-[0_0_30px_rgba(59,130,246,0.4)]',    // blue-500
  success: 'shadow-[0_0_30px_rgba(34,197,94,0.4)]',  // green-500
}

// Confirm button colors based on type
const buttonStyles: Record<DialogType, string> = {
  warning: 'bg-amber-500 hover:bg-amber-600',
  danger: 'bg-red-500 hover:bg-red-600',
  info: 'bg-primary hover:bg-primary/90',
  success: 'bg-green-500 hover:bg-green-600',
}

function ConfirmDialog({
  isOpen,
  type = 'warning',
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onCancel}
      size="sm"
      glowClassName={glowStyles[type]}
      className="w-80"
    >
      <div className="p-5">
        {/* Title */}
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-sm text-gray-500 mb-5">
          {message}
        </p>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="
              px-4 py-2 rounded-lg text-sm font-medium
              text-gray-600 hover:bg-gray-100
              transition-colors
            "
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium
              text-white
              transition-colors
              ${buttonStyles[type]}
            `}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalLayout>
  )
}

export default memo(ConfirmDialog)
