/**
 * Main App Component
 * Handles routing and provides global contexts
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ReactFlowProvider } from 'reactflow'

// Module system
import { ModuleProvider } from './core/context/ModuleContext'

// Auth
import { AuthProvider, AuthGuard } from './auth'

// Shared components
import { AIAssistantProvider } from './shared/AIAssistant'
import { AppLayout } from './shared/layouts/AppLayout'
import { ProjectShell } from './shared/layouts'

// Pages
import {
  DiagramPage,
  MindMapPage,
  FlowchartPage,
  HomePage,
  LoginPage,
  ProjectsListPage,
  ProjectWorkspacePage,
  GitHubCallbackPage,
} from './pages'

/**
 * App Routes
 * Defines the routing structure for all modules
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/github/callback" element={<GitHubCallbackPage />} />

      {/* Protected project routes - wrapped in ProjectShell */}
      <Route
        path="/projects"
        element={
          <AuthGuard>
            <ProjectShell />
          </AuthGuard>
        }
      >
        <Route index element={<ProjectsListPage />} />
        <Route path=":projectId" element={<ProjectWorkspacePage />} />
      </Route>

      {/* Free access - Diagram module route */}
      <Route
        path="/diagrams/*"
        element={
          <AppLayout>
            <DiagramPage />
          </AppLayout>
        }
      />

      {/* Free access - Mind Map module route */}
      <Route
        path="/mindmap/*"
        element={
          <AppLayout>
            <MindMapPage />
          </AppLayout>
        }
      />

      {/* Free access - Flowchart module route */}
      <Route
        path="/flowchart/*"
        element={
          <AppLayout>
            <FlowchartPage />
          </AppLayout>
        }
      />

      {/* Fallback - redirect unknown routes to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/**
 * Main App Component
 * Wraps the application with all necessary providers
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ReactFlowProvider>
          <ModuleProvider>
            <AIAssistantProvider>
              <AppRoutes />
            </AIAssistantProvider>
          </ModuleProvider>
        </ReactFlowProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
