/**
 * Project API - Barrel Export
 * Re-exports all types and APIs for the project management system
 */

// Base utilities
export { API_BASE_URL, fetchWithErrorHandling, parseErrorResponse } from './base'

// All types
export type {
  // Common
  ProjectStatus,
  DiagramType,
  MessageRole,
  MessageType,
  MessageStatus,
  PaginatedResponse,
  // Project
  Project,
  ProjectCreate,
  ProjectUpdate,
  // Diagram
  Diagram,
  DiagramListItem,
  DiagramCreate,
  DiagramUpdate,
  // Chat
  ChatMessage,
  ChatMessageCreate,
  ChatHistoryResponse,
  // Story
  StoryType,
  StoryPriority,
  StoryStatus,
  Story,
  StoryCreate,
  StoryUpdate,
  // Question
  QuestionStatus,
  Question,
  QuestionCreate,
  QuestionUpdate,
  // Decision
  DecisionStatus,
  AlternativeOption,
  Decision,
  DecisionCreate,
  DecisionUpdate,
  // Feature
  FeatureStatus,
  FeaturePriority,
  Feature,
  FeatureCreate,
  FeatureUpdate,
  FeatureGenerateRequest,
  FeatureDiscoveryRequest,
  FeatureDiscoveryEvent,
  CandidateFeature,
  FeatureBatchCreateRequest,
  // KPI
  KPIStatus,
  KPIPriority,
  KPICategory,
  KPI,
  KPICreate,
  KPIUpdate,
  KPIDiscoveryRequest,
  KPIDiscoveryEvent,
  CandidateKPI,
  KPIBatchCreateRequest,
  // User Journey
  JourneyStatus,
  EmotionLevel,
  JourneyPhase,
  JourneyStep,
  UserJourney,
  UserJourneyCreate,
  UserJourneyUpdate,
  UserJourneyGenerateRequest,
  // GitHub
  GitHubAttachment,
  ExternalRefs,
} from './types'

// API objects
export { projectApi } from './projects'
export { diagramApi } from './diagrams'
export { chatApi } from './chat'
export { storyApi } from './stories'
export { questionApi } from './questions'
export { decisionApi } from './decisions'
export { featureApi } from './features'
export { kpiApi } from './kpis'
export { userJourneyApi } from './userJourneys'
