# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProductScope is an AI-powered product building platform that helps define scope, visualize architecture, discover features, and track business KPIs. It includes three visualization modules: Architecture Diagrams (ReactFlow), Mind Maps (MindElixir), and Flowcharts (Mermaid.js), plus project management features for stories, questions, decisions, user journeys, and AI-powered feature/KPI discovery from GitHub.

## Commands

### Frontend
```bash
npm run dev       # Start Vite dev server (http://localhost:5173)
npm run build     # TypeScript compile + Vite production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

### Backend
```bash
cd backend
source venv/bin/activate   # Activate Python virtual environment
uvicorn app:app --reload   # Start FastAPI server (http://localhost:8000)
```

## Tech Stack

**Frontend**: React 19, TypeScript 5.9, ReactFlow 11, MindElixir, Mermaid.js, Tailwind CSS v4, Vite 7, Lucide React

**Backend**: Python 3.12+, FastAPI, OpenAI API (GPT-5/GPT-4o), LangGraph, Pydantic, WebSockets

## Architecture

### Module System

The app uses a module registry pattern for extensibility (`src/registry/ModuleRegistry.ts`):

```
src/modules/
├── diagrams/     # ReactFlow-based architecture diagrams
├── mindmap/      # MindElixir-based mind maps
└── flowchart/    # Mermaid.js-based flowcharts
```

Each module provides:
- Canvas component (main editor area)
- Palette/Sidebar (drag-and-drop elements)
- Workflow hook (state management)
- Type definitions

Routes: `/diagrams`, `/mindmap`, `/flowchart`

### State Management

Each module has its own workflow hook:
- `useWorkflow` (diagrams) - ReactFlow's `useNodesState`/`useEdgesState`
- `useMindMapWorkflow` - MindElixir instance management
- `useFlowchartWorkflow` - Mermaid code state with history

All modules implement the `ModuleWorkflow` interface (`src/core/types/module.ts`) for consistent operations.

### AI Integration

- Frontend: `src/shared/AIAssistant/` provides chat and voice UI
- Backend: FastAPI endpoints at `/api/diagrams/generate` and `/api/diagrams/operations`
- WebSocket: Realtime voice input at `/api/diagrams/ws/realtime`
- `AIAssistantProvider` context syncs module state with AI callbacks

### Multi-Agent Pipeline (Advanced Mode)

Backend uses a 7-stage LangGraph pipeline for diagram generation:

```
Architect → Component → [Connection ∥ Grouping] → Layout → Reviewer → Finalizer
```

| Agent | Model | Purpose |
|-------|-------|---------|
| Architect | GPT-5 | High-level architecture plan |
| Component | GPT-5 | Node type selection (39 types available) |
| Connection | GPT-5-mini | Edge definitions with protocol labels |
| Grouping | GPT-5-mini | Logical organization (parallel with Connection) |
| Layout | GPT-4o | 6-layer positioning with 24px grid snapping |
| Reviewer | GPT-5 | Quality check (score 1-10), can route back to fix |
| Finalizer | Deterministic | Compiles ReactFlow-compatible JSON |

Key files:
- `backend/app/services/multi_agent_streaming.py` - Pipeline orchestration
- `backend/app/core/ai/agent_state.py` - State definitions (ComponentSpec, ConnectionSpec, etc.)
- `backend/app/core/ai/prompts/` - Agent-specific prompts
- `backend/app/config.py` - Model configuration

### Key Data Models

```typescript
// Diagram nodes (ReactFlow)
interface BaseNodeData {
  label: string
  nodeType: NodeTypeId  // from nodeConfig.ts (39 types)
  tags?: string[]
  volumes?: VolumeAttachment[]
  isGroup?: boolean
}

// MindElixir uses its native MindElixirData format
// Flowcharts use raw Mermaid code strings
```

### Auto-Save

Each module auto-saves to localStorage:
- `diagrams`: via `useAutoSave` hook
- `mindmap`: `mindmap-autosave` key
- `flowchart`: `flowchart-autosave` key

## Styling

Brand colors in `src/styles/index.css`:
- Primary: `#0230a8` (blue), Secondary: `#ffcf00` (yellow)
- Node categories have distinct colors

Grid snapping: 24px increments

## Backend API

Requires `OPENAI_API_KEY` in `backend/.env`

Key endpoints:
- `POST /api/diagrams/generate` - Text to diagram (uses multi-agent pipeline)
- `POST /api/diagrams/operations` - CRUD with context
- `WS /api/diagrams/ws/realtime` - Voice input
- `POST /api/flowchart/operations` - Flowchart operations (includes `fix-syntax` operation)
- `POST /api/mindmap/operations` - Mind map operations

### Mermaid Syntax Validation & Auto-Fix

The flowchart module includes a multi-layer defense system for Mermaid syntax errors:

1. **Validator** (`backend/app/core/ai/validators/mermaid.py`) - Detects common LLM errors
2. **Auto-fix** (`backend/app/core/ai/nodes/finalize.py`) - Automatic correction during generation
3. **Fix Syntax button** - AI-powered repair via `/api/flowchart/operations` with `fix-syntax` operation

Common LLM errors handled:
| Pattern | Example | Fix |
|---------|---------|-----|
| Reserved keywords | `end` as node ID | → `endNode` |
| Invalid edge syntax | `--\|"Yes"\|` | → `-->\|"Yes"\|` |
| Edge label spacing | `-->\| "Yes" \|` | → `-->\|"Yes"\|` |
| Class comma spacing | `class A, B name` | → `class A,B name` |

Key files:
- `backend/app/core/ai/validators/mermaid.py` - Pattern detection
- `backend/app/core/ai/nodes/finalize.py` - Auto-fix functions (`_autofix_*`)
- `backend/app/modules/flowchart/routes/operations.py` - Fix-syntax endpoint

## ReactFlow Conventions

Node types must match registered types:
- Regular nodes: `type: "customNode"`
- Group nodes: `type: "groupNode"`
- Edges: `type: "custom"` with `animated: true`
