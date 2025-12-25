# ProductScope

AI-powered product building platform to define scope, visualize architecture, discover features, and track business KPIs.

## Features

### Product Vision & Architecture
- **Architecture Diagrams** - ReactFlow-based system visualization with 39+ node types and drag-and-drop interface
- **Mind Maps** - MindElixir-powered brainstorming and concept mapping
- **Flowcharts** - Mermaid.js syntax for process flows with live preview

### AI-Powered Discovery
- **Feature Discovery** - Automatically extract and analyze features from GitHub repositories
- **KPI Discovery** - Identify business metrics that valorize your application
- **Natural Language Generation** - Describe your architecture, AI generates the diagram

### Product Management
- **Projects** - Organize diagrams, features, and KPIs by project
- **User Stories** - Track user requirements and acceptance criteria
- **User Journeys** - Map customer experiences across touchpoints
- **Questions & Decisions** - Document product decisions and open questions

### AI Integration
- Multi-agent pipeline for complex diagram generation (7 specialized agents)
- Voice input with real-time transcription via OpenAI Realtime API
- Context-aware operations (add, modify, delete nodes/edges)
- Intelligent layout algorithms with grid snapping

### Export Options
- PNG, SVG, and JSON formats
- Import/export for sharing

## Installation

### Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL 16+ (or Docker)
- OpenAI API key

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/maxime/ProductScope.git
cd ProductScope

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

The frontend will be available at http://localhost:5173

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
```

### Environment Configuration

Edit `backend/.env` with your credentials:

```bash
# Required: OpenAI API key
OPENAI_API_KEY=sk-your-api-key-here

# Required: JWT secrets (generate with: python -c "import secrets; print(secrets.token_urlsafe(32))")
JWT_SECRET_KEY=your-secret-key
JWT_REFRESH_SECRET_KEY=your-refresh-secret-key

# Optional: GitHub OAuth for repository integration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Database Setup

Using Docker (recommended):

```bash
cd backend
docker-compose up -d
```

Or connect to an existing PostgreSQL instance by setting `DATABASE_URL` in `.env`.

Run migrations:

```bash
alembic upgrade head
```

### Start the Backend

```bash
uvicorn app:app --reload
```

The API will be available at http://localhost:8000

## Tech Stack

**Frontend**
- React 19 with TypeScript 5.9
- ReactFlow 11 for diagram canvas
- MindElixir for mind maps
- Mermaid.js for flowcharts
- Tailwind CSS v4
- Vite 7

**Backend**
- FastAPI with Python 3.12+
- OpenAI API (GPT-4o, GPT-5, Realtime API)
- LangGraph for multi-agent orchestration
- SQLAlchemy with PostgreSQL
- WebSockets for voice input

## Project Structure

```
ProductScope/
├── src/                        # Frontend source
│   ├── modules/
│   │   ├── diagrams/          # Architecture diagrams (ReactFlow)
│   │   ├── mindmap/           # Mind maps (MindElixir)
│   │   └── flowchart/         # Flowcharts (Mermaid.js)
│   ├── pages/
│   │   └── projects/          # Project management UI
│   ├── services/              # API services
│   ├── shared/                # Shared components & AI assistant
│   └── core/                  # Module registry & types
│
├── backend/                   # Backend source
│   ├── app/
│   │   ├── api/              # REST endpoints
│   │   ├── core/ai/          # AI agents and prompts
│   │   ├── models/           # SQLAlchemy models
│   │   ├── repositories/     # Database operations
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # Business logic
│   ├── alembic/              # Database migrations
│   └── requirements.txt
│
└── public/                    # Static assets
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | CRUD | Project management |
| `/api/projects/{id}/diagrams` | CRUD | Diagram management |
| `/api/projects/{id}/features` | CRUD | Feature management |
| `/api/projects/{id}/kpis` | CRUD | KPI management |
| `/api/projects/{id}/stories` | CRUD | User stories |
| `/api/projects/{id}/journeys` | CRUD | User journeys |
| `/api/diagrams/generate` | POST | AI diagram generation |
| `/api/diagrams/ws/realtime` | WS | Voice input streaming |

## Development

```bash
# Frontend
npm run dev       # Development server
npm run build     # Production build
npm run lint      # ESLint check

# Backend
uvicorn app:app --reload  # Development server with hot reload
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
