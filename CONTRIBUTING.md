# Contributing to ProductScope

Thank you for your interest in contributing to ProductScope! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.12+
- PostgreSQL 16+
- OpenAI API key

### Frontend Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`.

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your API keys

# Start PostgreSQL (using Docker)
docker-compose up -d

# Run database migrations
alembic upgrade head

# Start the server
uvicorn app:app --reload
```

The backend API will be available at `http://localhost:8000`.

## Code Standards

### Frontend (TypeScript/React)

- Use TypeScript for all new code
- Follow the existing component patterns in `src/modules/`
- Use Tailwind CSS for styling
- Run `npm run lint` before committing

### Backend (Python/FastAPI)

- Follow PEP 8 style guidelines
- Use type hints for all functions
- Write docstrings for public functions
- Use Pydantic models for request/response validation

## Project Structure

```
ProductScope/
├── src/                    # Frontend source
│   ├── modules/           # Feature modules (diagrams, mindmap, flowchart)
│   ├── pages/             # Page components
│   ├── services/          # API services
│   └── shared/            # Shared components
├── backend/               # Backend source
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # AI and business logic
│   │   ├── models/       # SQLAlchemy models
│   │   ├── repositories/ # Database operations
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business services
│   └── alembic/          # Database migrations
└── public/               # Static assets
```

## Making Changes

1. **Fork** the repository
2. **Create a branch** for your feature: `git checkout -b feature/my-feature`
3. **Make your changes** following the code standards
4. **Test** your changes locally
5. **Commit** with clear messages: `git commit -m "Add: feature description"`
6. **Push** to your fork: `git push origin feature/my-feature`
7. **Open a Pull Request** with a clear description

## Commit Messages

Use clear, descriptive commit messages:

- `Add: description` - New feature
- `Fix: description` - Bug fix
- `Update: description` - Enhancement to existing feature
- `Refactor: description` - Code refactoring
- `Docs: description` - Documentation changes

## Reporting Issues

When reporting issues, please include:

- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Browser/environment information

## Questions?

Feel free to open an issue for any questions about contributing.
