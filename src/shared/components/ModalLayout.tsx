/**
 * Modal Layout Component
 * Reusable modal container with backdrop and standard styling
 */

import { memo, useEffect, useCallback, type ReactNode } from 'react'

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
}

export interface ModalLayoutProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Modal content */
  children: ReactNode
  /** Modal size preset */
  size?: ModalSize
  /** Whether clicking outside closes the modal */
  closeOnBackdrop?: boolean
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean
  /** Additional className for the modal container */
  className?: string
  /** Additional className for the backdrop */
  backdropClassName?: string
  /** Custom glow effect (e.g., for warning dialogs) */
  glowClassName?: string
}

function ModalLayout({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  className = '',
  backdropClassName = '',
  glowClassName = '',
}: ModalLayoutProps) {
  // Handle escape key to close
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose()
      }
    },
    [onClose, closeOnEscape]
  )

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const handleBackdropClick = () => {
    if (closeOnBackdrop) {
      onClose()
    }
  }

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${backdropClassName}`}
      onClick={handleBackdropClick}
    >
      <div
        className={`
          bg-white rounded-xl shadow-xl w-full
          animate-in fade-in zoom-in-95 duration-200
          ${sizeClasses[size]}
          ${glowClassName}
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export default memo(ModalLayout)
