/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in child component tree and displays
 * a fallback UI instead of crashing the whole app.
 *
 * Usage:
 *   <ErrorBoundary fallback={<CustomError />}>
 *     <MyComponent />
 *   </ErrorBoundary>
 *
 * Or with render prop for more control:
 *   <ErrorBoundary
 *     onError={(error, info) => logToService(error)}
 *     fallbackRender={({ error, resetError }) => (
 *       <div>
 *         <p>Error: {error.message}</p>
 *         <button onClick={resetError}>Retry</button>
 *       </div>
 *     )}
 *   >
 *     <MyComponent />
 *   </ErrorBoundary>
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface FallbackProps {
  error: Error
  errorInfo: ErrorInfo | null
  resetError: () => void
}

interface ErrorBoundaryProps {
  children: ReactNode
  /** Static fallback UI to show on error */
  fallback?: ReactNode
  /** Render prop for custom error UI with access to error details */
  fallbackRender?: (props: FallbackProps) => ReactNode
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Reset error when this key changes */
  resetKey?: string | number
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

/**
 * Error Boundary for catching and displaying errors gracefully.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error)
      console.error('Component stack:', errorInfo.componentStack)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKey changes
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError()
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback, fallbackRender } = this.props

    if (hasError && error) {
      // Use custom render prop if provided
      if (fallbackRender) {
        return fallbackRender({
          error,
          errorInfo,
          resetError: this.resetError,
        })
      }

      // Use static fallback if provided
      if (fallback) {
        return fallback
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={error}
          errorInfo={errorInfo}
          resetError={this.resetError}
        />
      )
    }

    return children
  }
}

/**
 * Default error fallback UI
 */
function DefaultErrorFallback({
  error,
  errorInfo,
  resetError,
}: FallbackProps) {
  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-center gap-2 text-red-600 mb-4">
        <AlertTriangle className="w-6 h-6" />
        <h2 className="text-lg font-semibold">Something went wrong</h2>
      </div>

      <p className="text-sm text-red-600 mb-4 text-center max-w-md">
        {error.message || 'An unexpected error occurred'}
      </p>

      <button
        onClick={resetError}
        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>

      {isDevelopment && errorInfo && (
        <details className="mt-4 w-full max-w-2xl">
          <summary className="text-sm text-red-500 cursor-pointer hover:text-red-600">
            Stack trace (development only)
          </summary>
          <pre className="mt-2 p-3 bg-red-100 rounded text-xs text-red-800 overflow-auto max-h-48">
            {error.stack}
            {errorInfo.componentStack}
          </pre>
        </details>
      )}
    </div>
  )
}

/**
 * Module-specific error boundary with styled fallback
 */
export function ModuleErrorBoundary({
  children,
  moduleName,
  onError,
}: {
  children: ReactNode
  moduleName: string
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}) {
  return (
    <ErrorBoundary
      onError={onError}
      fallbackRender={({ error, resetError }) => (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] bg-gray-50">
          <div className="p-8 bg-white rounded-xl shadow-lg border border-gray-200 max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {moduleName} Error
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {error.message || `The ${moduleName.toLowerCase()} module encountered an error.`}
            </p>
            <button
              onClick={resetError}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Reload {moduleName}
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

/**
 * Canvas-specific error boundary for diagram/mindmap/flowchart modules
 */
export function CanvasErrorBoundary({
  children,
  onError,
}: {
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}) {
  return (
    <ErrorBoundary
      onError={onError}
      fallbackRender={({ error, resetError }) => (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100">
          <div className="p-6 bg-white rounded-lg shadow-md border border-gray-200 max-w-sm text-center">
            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Canvas Error
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {error.message || 'The canvas failed to render properly.'}
            </p>
            <button
              onClick={resetError}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary
