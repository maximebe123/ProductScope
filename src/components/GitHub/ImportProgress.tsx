/**
 * Import Progress Component
 * Displays progress during GitHub import with animated stages and agent activity log
 */

import { memo, useEffect, useRef } from 'react'
import {
  Check,
  GitBranch,
  Code,
  Lightbulb,
  FileBox,
  Loader2,
  Brain,
  Boxes,
  GitMerge,
  LayoutGrid,
  Shield,
  Package,
  CheckCircle2,
  AlertCircle,
  Save,
  Workflow,
} from 'lucide-react'

export interface ImportProgressData {
  stage: string
  message: string
  progress: number
  details?: {
    repo_name?: string
    file_count?: number
    languages?: string[]
    frameworks?: string[]
    diagram_count?: number
    diagram_type?: string
    diagram_title?: string
    project_id?: string
    error?: string
    agent?: string
    score?: number
    decision?: string
  }
}

interface ImportProgressProps {
  progress: ImportProgressData
  agentLogs: ImportProgressData[]
}

const stages = [
  { id: 'fetching', label: 'Fetching', icon: GitBranch },
  { id: 'analyzing', label: 'Analyzing', icon: Code },
  { id: 'planning', label: 'Planning', icon: Lightbulb },
  { id: 'generating', label: 'Generating', icon: FileBox },
]

const agentIcons: Record<string, typeof Brain> = {
  architect: Brain,
  component: Boxes,
  connection: GitMerge,
  grouping: LayoutGrid,
  layout: LayoutGrid,
  reviewer: Shield,
  finalizer: Package,
  flowchart: Workflow,
  saved: Save,
  error: AlertCircle,
}

const agentColors: Record<string, string> = {
  architect: 'text-purple-600 bg-purple-50',
  component: 'text-blue-600 bg-blue-50',
  connection: 'text-cyan-600 bg-cyan-50',
  grouping: 'text-teal-600 bg-teal-50',
  layout: 'text-indigo-600 bg-indigo-50',
  reviewer: 'text-amber-600 bg-amber-50',
  finalizer: 'text-green-600 bg-green-50',
  flowchart: 'text-orange-600 bg-orange-50',
  saved: 'text-green-600 bg-green-50',
  error: 'text-red-600 bg-red-50',
}

function ImportProgress({ progress, agentLogs }: ImportProgressProps) {
  const currentStageIndex = stages.findIndex((s) => s.id === progress.stage)
  const isComplete = progress.stage === 'complete'
  const isError = progress.stage === 'error'
  const isInAgentPhase = progress.stage === 'agent' || progress.stage === 'generating'
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [agentLogs])

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isError ? 'bg-red-500' : isComplete ? 'bg-green-500' : 'bg-primary'
            }`}
            style={{ width: `${progress.progress}%` }}
          />
        </div>
        <span className="absolute right-0 -top-6 text-xs text-gray-500">
          {progress.progress}%
        </span>
      </div>

      {/* Stages */}
      <div className="flex justify-between">
        {stages.map((stage, index) => {
          const Icon = stage.icon
          const isActive = progress.stage === stage.id || (isInAgentPhase && stage.id === 'generating')
          const isCompleted = currentStageIndex > index || isComplete || (isInAgentPhase && index < 3)
          const isPending = !isActive && !isCompleted

          return (
            <div
              key={stage.id}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isActive ? 'bg-primary text-white ring-4 ring-primary/20' : ''}
                  ${isPending ? 'bg-gray-100 text-gray-400' : ''}
                  ${isError && isActive ? 'bg-red-500 text-white ring-4 ring-red-500/20' : ''}
                `}
              >
                {isCompleted ? (
                  <Check size={18} />
                ) : isActive ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Icon size={18} />
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive || isCompleted ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Agent Activity Log */}
      {agentLogs.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 max-h-48 overflow-y-auto font-mono text-xs">
          <div className="space-y-2">
            {agentLogs.map((log, index) => {
              const agentName = log.details?.agent || 'system'
              const Icon = agentIcons[agentName] || Brain
              const colorClass = agentColors[agentName] || 'text-gray-400 bg-gray-800'
              const isLatest = index === agentLogs.length - 1

              return (
                <div
                  key={index}
                  className={`flex items-start gap-2 ${isLatest ? 'animate-pulse' : ''}`}
                >
                  <div className={`p-1 rounded ${colorClass}`}>
                    <Icon size={12} />
                  </div>
                  <div className="flex-1">
                    <span className="text-gray-400">
                      [{log.details?.diagram_title || 'Diagram'}]
                    </span>{' '}
                    <span className="text-gray-200">{log.message}</span>
                    {log.details?.score && (
                      <span className={`ml-2 ${log.details.score >= 7 ? 'text-green-400' : 'text-amber-400'}`}>
                        ({log.details.score}/10)
                      </span>
                    )}
                  </div>
                  {isLatest && agentName !== 'saved' && agentName !== 'error' ? (
                    <Loader2 size={12} className="animate-spin text-gray-500" />
                  ) : agentName === 'saved' ? (
                    <CheckCircle2 size={12} className="text-green-500" />
                  ) : agentName === 'error' ? (
                    <AlertCircle size={12} className="text-red-500" />
                  ) : (
                    <Check size={12} className="text-green-500" />
                  )}
                </div>
              )
            })}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}

      {/* Current Message (when not in agent phase) */}
      {!isInAgentPhase && (
        <div
          className={`
            text-center py-4 px-6 rounded-lg
            ${isError ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}
          `}
        >
          <p className="text-sm font-medium">{progress.message}</p>

          {/* Additional Details */}
          {progress.details && !isError && (
            <div className="mt-3 text-xs text-gray-500 space-y-1">
              {progress.details.repo_name && (
                <p>Repository: <span className="font-medium">{progress.details.repo_name}</span></p>
              )}
              {progress.details.file_count && (
                <p>Files: <span className="font-medium">{progress.details.file_count}</span></p>
              )}
              {progress.details.languages && progress.details.languages.length > 0 && (
                <p>Languages: <span className="font-medium">{progress.details.languages.join(', ')}</span></p>
              )}
              {progress.details.frameworks && progress.details.frameworks.length > 0 && (
                <p>Frameworks: <span className="font-medium">{progress.details.frameworks.join(', ')}</span></p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success State */}
      {isComplete && progress.details?.project_id && (
        <div className="text-center py-4 px-6 rounded-lg bg-green-50 text-green-700">
          <p className="text-sm font-medium">
            Project created successfully!
          </p>
          {progress.details.diagram_count && (
            <p className="text-xs mt-1">
              {progress.details.diagram_count} diagram(s) generated
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default memo(ImportProgress)
