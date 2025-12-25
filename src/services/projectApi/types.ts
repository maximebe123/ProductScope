/**
 * Type definitions for Project API
 */

// ============================================================================
// Common Types
// ============================================================================

export type ProjectStatus = 'draft' | 'active' | 'archived' | 'completed'
export type DiagramType = 'architecture' | 'mindmap' | 'flowchart' | 'journey' | 'storymap'

// ============================================================================
// GitHub Types
// ============================================================================

export interface GitHubAttachment {
  url: string
  owner: string
  repo_name: string
  attached_at: string
  branch?: string
  description?: string
  stars?: number
  language?: string
  is_private?: boolean
}

export interface ExternalRefs {
  github?: GitHubAttachment
  [key: string]: unknown
}
export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageType = 'text' | 'action' | 'error' | 'diagram_update'
export type MessageStatus = 'pending' | 'complete' | 'error'

// ============================================================================
// Project Types
// ============================================================================

export interface Project {
  id: string
  name: string
  description: string | null
  status: ProjectStatus
  tags: string[]
  external_refs: ExternalRefs
  created_at: string
  updated_at: string
  story_count?: number
  diagram_count?: number
  question_count?: number
  transcript_count?: number
  decision_count?: number
}

export interface ProjectCreate {
  name: string
  description?: string
  tags?: string[]
  external_refs?: ExternalRefs
}

export interface ProjectUpdate {
  name?: string
  description?: string
  status?: ProjectStatus
  tags?: string[]
  external_refs?: ExternalRefs
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============================================================================
// Diagram Types
// ============================================================================

export interface Diagram {
  id: string
  project_id: string
  name: string
  description: string | null
  diagram_type: DiagramType
  data: Record<string, unknown>
  thumbnail: string | null
  version: number
  parent_version_id: string | null
  created_at: string
  updated_at: string
}

export interface DiagramListItem {
  id: string
  name: string
  description: string | null
  diagram_type: DiagramType
  thumbnail: string | null
  version: number
  created_at: string
  updated_at: string
}

export interface DiagramCreate {
  name: string
  description?: string
  diagram_type: DiagramType
  data: Record<string, unknown>
}

export interface DiagramUpdate {
  name?: string
  description?: string
  data?: Record<string, unknown>
  thumbnail?: string
}

// ============================================================================
// Chat Types
// ============================================================================

export interface ChatMessage {
  id: string
  project_id: string
  diagram_id: string | null
  role: MessageRole
  content: string
  message_type: MessageType
  status: MessageStatus
  extra_data: Record<string, unknown>
  timestamp: string
}

export interface ChatMessageCreate {
  role: MessageRole
  content: string
  message_type?: MessageType
  status?: MessageStatus
  extra_data?: Record<string, unknown>
}

export interface ChatHistoryResponse {
  messages: ChatMessage[]
  total: number
}

// ============================================================================
// Story Types
// ============================================================================

export type StoryType = 'user_story' | 'bug' | 'technical' | 'spike'
export type StoryPriority = 'low' | 'medium' | 'high' | 'critical'
export type StoryStatus = 'draft' | 'ready' | 'in_progress' | 'done' | 'rejected'

export interface Story {
  id: string
  project_id: string
  title: string
  as_a: string | null
  i_want: string | null
  so_that: string | null
  acceptance_criteria: Array<{ id: string; criterion: string; status: string }>
  story_type: StoryType
  priority: StoryPriority
  status: StoryStatus
  story_points: number | null
  tags: string[]
  source_transcript_id: string | null
  external_ref: Record<string, string> | null
  created_at: string
  updated_at: string
}

export interface StoryCreate {
  title: string
  as_a?: string
  i_want?: string
  so_that?: string
  acceptance_criteria?: Array<{ id: string; criterion: string; status: string }>
  story_type?: StoryType
  priority?: StoryPriority
  story_points?: number
  tags?: string[]
  source_transcript_id?: string
}

export interface StoryUpdate {
  title?: string
  as_a?: string
  i_want?: string
  so_that?: string
  acceptance_criteria?: Array<{ id: string; criterion: string; status: string }>
  story_type?: StoryType
  priority?: StoryPriority
  status?: StoryStatus
  story_points?: number
  tags?: string[]
  external_ref?: Record<string, string>
}

// ============================================================================
// Question Types
// ============================================================================

export type QuestionStatus = 'open' | 'answered' | 'deferred' | 'closed'

export interface Question {
  id: string
  project_id: string
  question: string
  context: string | null
  status: QuestionStatus
  answer: string | null
  answered_by: string | null
  answered_at: string | null
  source_transcript_id: string | null
  created_at: string
  updated_at: string
}

export interface QuestionCreate {
  question: string
  context?: string
  source_transcript_id?: string
}

export interface QuestionUpdate {
  question?: string
  context?: string
  status?: QuestionStatus
  answer?: string
  answered_by?: string
}

// ============================================================================
// Decision Types
// ============================================================================

export type DecisionStatus = 'proposed' | 'approved' | 'rejected' | 'superseded'

export interface AlternativeOption {
  option: string
  pros: string[]
  cons: string[]
}

export interface Decision {
  id: string
  project_id: string
  title: string
  description: string
  rationale: string | null
  status: DecisionStatus
  alternatives: AlternativeOption[]
  affected_areas: string[]
  decided_by: string | null
  decided_at: string | null
  superseded_by_id: string | null
  created_at: string
  updated_at: string
}

export interface DecisionCreate {
  title: string
  description: string
  rationale?: string
  alternatives?: AlternativeOption[]
  affected_areas?: string[]
}

export interface DecisionUpdate {
  title?: string
  description?: string
  rationale?: string
  status?: DecisionStatus
  alternatives?: AlternativeOption[]
  affected_areas?: string[]
  decided_by?: string
}

// ============================================================================
// Feature Types
// ============================================================================

export type FeatureStatus = 'draft' | 'defined' | 'in_progress' | 'shipped' | 'archived'
export type FeaturePriority = 'low' | 'medium' | 'high' | 'critical'

export interface Feature {
  id: string
  project_id: string
  title: string
  problem: string | null
  solution: string | null
  target_users: string | null
  success_metrics: string | null
  user_stories: string[]
  technical_notes: string | null
  status: FeatureStatus
  priority: FeaturePriority
  tags: string[]
  created_at: string
  updated_at: string
}

export interface FeatureCreate {
  title: string
  problem?: string
  solution?: string
  target_users?: string
  success_metrics?: string
  user_stories?: string[]
  technical_notes?: string
  priority?: FeaturePriority
  tags?: string[]
}

export interface FeatureUpdate {
  title?: string
  problem?: string
  solution?: string
  target_users?: string
  success_metrics?: string
  user_stories?: string[]
  technical_notes?: string
  status?: FeatureStatus
  priority?: FeaturePriority
  tags?: string[]
}

export interface FeatureGenerateRequest {
  description: string
}

// Feature Discovery Types
export interface FeatureDiscoveryRequest {
  max_features?: number
  include_tech_debt?: boolean
  user_context?: string
  auth_token?: string
}

// Feature Extraction Types (extract existing features)
export interface FeatureExtractionRequest {
  max_features?: number
  focus_areas?: string[]
  user_context?: string
  auth_token?: string
}

export type FeatureExtractionEvent = FeatureDiscoveryEvent // Same event format

export interface CandidateFeature {
  temp_id: string
  title: string
  problem: string
  solution: string
  target_users: string
  success_metrics: string
  technical_notes: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  priority_score: number
  effort_estimate: 'small' | 'medium' | 'large' | 'xlarge'
  impact_estimate: 'low' | 'medium' | 'high'
  tags: string[]
  category: string
  source: string
  selected?: boolean // For UI state
}

export interface FeatureDiscoveryEvent {
  type: 'agent_start' | 'reasoning' | 'content' | 'agent_complete' | 'feature_preview' | 'progress' | 'complete' | 'error'
  agent?: string
  description?: string
  token?: string
  summary?: string
  count?: number
  progress?: number
  temp_id?: string
  title?: string
  category?: string
  features?: CandidateFeature[]
  total?: number
  message?: string
}

export interface FeatureBatchCreateRequest {
  features: CandidateFeature[]
}

// ============================================================================
// KPI Types
// ============================================================================

export type KPIStatus = 'draft' | 'defined' | 'tracking' | 'archived'
export type KPIPriority = 'low' | 'medium' | 'high' | 'critical'
export type KPICategory = 'efficiency' | 'quality' | 'adoption' | 'revenue' | 'satisfaction' | 'growth' | 'operational'

export interface KPI {
  id: string
  project_id: string
  name: string
  definition: string
  category: KPICategory
  calculation_method: string | null
  data_sources: string[]
  unit: string | null
  frequency: string | null
  target_guidance: string | null
  business_value: string | null
  impact_areas: string[]
  technical_notes: string | null
  status: KPIStatus
  priority: KPIPriority
  tags: string[]
  created_at: string
  updated_at: string
}

export interface KPICreate {
  name: string
  definition: string
  category?: KPICategory
  calculation_method?: string
  data_sources?: string[]
  unit?: string
  frequency?: string
  target_guidance?: string
  business_value?: string
  impact_areas?: string[]
  technical_notes?: string
  priority?: KPIPriority
  tags?: string[]
}

export interface KPIUpdate {
  name?: string
  definition?: string
  category?: KPICategory
  calculation_method?: string
  data_sources?: string[]
  unit?: string
  frequency?: string
  target_guidance?: string
  business_value?: string
  impact_areas?: string[]
  technical_notes?: string
  status?: KPIStatus
  priority?: KPIPriority
  tags?: string[]
}

// KPI Discovery Types
export interface KPIDiscoveryRequest {
  focus_categories?: string[]
  user_context?: string
  auth_token?: string
}

export interface CandidateKPI {
  temp_id: string
  name: string
  definition: string
  category: string
  calculation_method: string
  data_sources: string[]
  unit: string | null
  frequency: string
  target_guidance: string | null
  business_value: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  priority_score: number
  impact_areas: string[]
  selected?: boolean // For UI state
}

export interface KPIDiscoveryEvent {
  type: 'agent_start' | 'reasoning' | 'content' | 'agent_complete' | 'kpi_preview' | 'progress' | 'complete' | 'error'
  agent?: string
  description?: string
  token?: string
  summary?: string
  count?: number
  progress?: number
  temp_id?: string
  name?: string
  category?: string
  kpis?: CandidateKPI[]
  total?: number
  message?: string
}

export interface KPIBatchCreateRequest {
  kpis: CandidateKPI[]
}

// ============================================================================
// User Journey Types
// ============================================================================

export type JourneyStatus = 'draft' | 'validated' | 'archived'
export type EmotionLevel = 1 | 2 | 3 | 4 | 5

export interface JourneyPhase {
  id: string
  name: string
  order: number
}

export interface JourneyStep {
  id: string
  phase_id: string
  action: string
  touchpoint: string
  emotion: EmotionLevel
  thought: string | null
  pain_point: string | null
  opportunity: string | null
  order: number
}

export interface UserJourney {
  id: string
  project_id: string
  title: string
  persona: string | null
  description: string | null
  phases: JourneyPhase[]
  steps: JourneyStep[]
  status: JourneyStatus
  tags: string[]
  created_at: string
  updated_at: string
}

export interface UserJourneyCreate {
  title: string
  persona?: string
  description?: string
  phases?: JourneyPhase[]
  steps?: JourneyStep[]
  tags?: string[]
}

export interface UserJourneyUpdate {
  title?: string
  persona?: string
  description?: string
  phases?: JourneyPhase[]
  steps?: JourneyStep[]
  status?: JourneyStatus
  tags?: string[]
}

export interface UserJourneyGenerateRequest {
  persona: string
  goal: string
}
