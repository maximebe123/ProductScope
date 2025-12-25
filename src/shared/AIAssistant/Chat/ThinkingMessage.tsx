/**
 * Thinking Message Component
 *
 * Displays the real-time reasoning process from GPT-5 agents
 * during advanced mode generation.
 *
 * Features:
 * - Real-time streaming of reasoning tokens
 * - Agent identification with icon
 * - Progress badges for completed agents
 * - Blinking cursor animation
 */

import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Building2,
  Boxes,
  Cable,
  Group,
  Layout,
  CheckCircle,
  Wand2,
  Brain,
} from 'lucide-react'
import type {
  AgentName,
  AgentProgress,
} from '../../../services/streamingApi'
import { AGENT_LABELS } from '../../../services/streamingApi'

interface ThinkingMessageProps {
  /** Current agent that is thinking */
  currentAgent: AgentName | null
  /** Accumulated reasoning content */
  reasoningContent: string
  /** Progress of all agents in the pipeline */
  agentProgress: AgentProgress[]
  /** Whether streaming is currently active */
  isStreaming: boolean
}

/**
 * Get icon component for an agent
 */
function getAgentIcon(agent: AgentName) {
  switch (agent) {
    case 'architect':
      return Building2
    case 'component':
      return Boxes
    case 'connection':
      return Cable
    case 'grouping':
      return Group
    case 'layout':
      return Layout
    case 'reviewer':
      return CheckCircle
    case 'finalizer':
      return Wand2
    default:
      return Brain
  }
}

/**
 * Get description for an agent's task
 */
function getAgentDescription(agent: AgentName): string {
  switch (agent) {
    case 'architect':
      return 'Analyzing architecture requirements...'
    case 'component':
      return 'Designing system components...'
    case 'connection':
      return 'Creating connections...'
    case 'grouping':
      return 'Organizing into groups...'
    case 'layout':
      return 'Calculating layout...'
    case 'reviewer':
      return 'Reviewing quality...'
    case 'finalizer':
      return 'Assembling diagram...'
    default:
      return 'Processing...'
  }
}

function ThinkingMessage({
  currentAgent,
  reasoningContent,
  agentProgress,
  isStreaming,
}: ThinkingMessageProps) {
  if (!currentAgent && !isStreaming) {
    return null
  }

  const AgentIcon = currentAgent ? getAgentIcon(currentAgent) : Brain
  const agentLabel = currentAgent ? AGENT_LABELS[currentAgent] : 'Processing'
  const agentDescription = currentAgent
    ? getAgentDescription(currentAgent)
    : 'Preparing...'

  return (
    <div className="flex gap-2 animate-message-in">
      {/* Agent Avatar */}
      <div className="flex-shrink-0 self-start w-7 h-7 rounded-full flex items-center justify-center bg-blue-50 text-blue-600">
        <Brain size={14} />
      </div>

      {/* Thinking Content */}
      <div className="flex-1 max-w-[90%]">
        {/* Agent Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-full">
            <AgentIcon size={12} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              {agentLabel}
            </span>
          </div>
          <span className="text-xs text-gray-400">{agentDescription}</span>
          {isStreaming && (
            <div className="flex gap-0.5 ml-1">
              <span
                className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          )}
        </div>

        {/* Reasoning Content */}
        {reasoningContent && (
          <div className="bg-gray-50 rounded-xl rounded-tl-sm px-4 py-3 mb-3">
            <div className="text-sm text-gray-600 prose prose-sm prose-gray max-w-none
              prose-p:my-1 prose-p:leading-relaxed
              prose-strong:text-gray-700 prose-strong:font-semibold
              prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
              prose-headings:text-gray-800 prose-headings:font-semibold prose-headings:mt-2 prose-headings:mb-1
              prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
            ">
              <ReactMarkdown>
                {reasoningContent}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-gray-400 animate-pulse" />
              )}
            </div>
          </div>
        )}

        {/* Progress Badges */}
        {agentProgress.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {agentProgress.map((progress) => {
              const Icon = getAgentIcon(progress.agent)
              const isComplete = progress.status === 'complete'
              const isRunning = progress.status === 'running'

              return (
                <div
                  key={progress.agent}
                  className={`
                    flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium
                    transition-all duration-300
                    ${
                      isComplete
                        ? 'bg-green-100 text-green-700'
                        : isRunning
                          ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300 ring-opacity-50'
                          : 'bg-gray-100 text-gray-500'
                    }
                  `}
                  title={progress.summary}
                >
                  <Icon size={10} />
                  <span>{AGENT_LABELS[progress.agent]}</span>
                  {isComplete && (
                    <CheckCircle size={10} className="text-green-600" />
                  )}
                  {isRunning && (
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(ThinkingMessage)
