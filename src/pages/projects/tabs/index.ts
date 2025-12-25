/**
 * Project Workspace Tabs
 * Barrel export for all tab components
 */

export { OverviewTab, type OverviewTabProps } from './OverviewTab'
export { DiagramsTab, type DiagramsTabProps } from './DiagramsTab'
export { StoriesTab, type StoriesTabProps } from './StoriesTab'
export { QuestionsTab, type QuestionsTabProps } from './QuestionsTab'
export { DecisionsTab, type DecisionsTabProps } from './DecisionsTab'
export { FeaturesTab, type FeaturesTabProps } from './FeaturesTab'
export { KPIsTab, type KPIsTabProps } from './KPIsTab'
export { UserJourneyTab, type UserJourneyTabProps } from './UserJourneyTab'
export { NewDiagramModal, type NewDiagramModalProps } from './NewDiagramModal'

// Re-export status metadata from constants
export { STORY_STATUS_META, QUESTION_STATUS_META, DECISION_STATUS_META } from '../constants'
