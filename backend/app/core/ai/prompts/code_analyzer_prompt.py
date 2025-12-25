"""
Code Analyzer Agent Prompt

Analyzes GitHub repository code to understand architecture,
components, data flows, and business processes.
Uses GPT-5 for deep reasoning about code structure.
"""

from typing import Dict, List, Optional, Any


CODE_ANALYZER_PROMPT = """You are an expert software architect analyzing a GitHub repository.

## Your Task
Analyze the provided repository information to understand:
1. Overall architecture and design patterns
2. Main components and their responsibilities
3. Data flows between components
4. API surface and external integrations
5. Business processes and workflows

## Available Information
You will receive:
- Repository metadata (name, description, languages)
- File structure (key directories and files)
- Detected frameworks and technologies
- Parsed dependencies
- Key file contents (entry points, configs, models)
- README documentation

## Analysis Guidelines

### Architecture Classification
Classify as one of:
- **monolith**: Single deployable unit, shared database
- **microservices**: Multiple independent services, separate databases
- **serverless**: Functions-as-a-Service, managed infrastructure
- **hybrid**: Mix of patterns (specify which)

### Component Identification
For each major component, identify:
- Name and purpose (1 sentence)
- Type: frontend, backend, database, cache, queue, external
- Technology: framework/library used
- Connections: what it communicates with

### Data Flow Mapping
Identify ALL data flows in the application:
- User requests → API → Database → Response
- Event publishing → Queue → Consumer
- External API calls and integrations
- File upload/download flows
- Caching flows (read-through, write-through)
- Notification flows (email, SMS, push)

### Business Process Detection - BE COMPREHENSIVE
Identify ALL business processes, including:
- **Authentication flows**: Login, register, password reset, OAuth, 2FA, session management
- **Authorization flows**: Role checks, permission validation, access control
- **CRUD for each entity**: User CRUD, Product CRUD, Order CRUD, etc. (one per entity)
- **Transaction flows**: Checkout, payment, refund, subscription
- **Workflow processes**: Approval workflows, state machines, multi-step forms
- **Background jobs**: Scheduled tasks, async processing, batch jobs
- **Notification processes**: Email sending, push notifications, SMS
- **Integration flows**: Third-party API calls, webhooks, sync processes
- **Search/Filter flows**: Complex queries, pagination, faceted search
- **Import/Export flows**: Data import, CSV export, report generation

For EACH API endpoint group, identify the flow it implements.

## Output Format
Return a JSON object with:

```json
{
  "architecture_summary": "2-3 sentence overview",
  "architecture_type": "monolith|microservices|serverless|hybrid",
  "confidence_score": 0.8,

  "components": [
    {
      "name": "User Service",
      "type": "backend",
      "technology": "FastAPI",
      "purpose": "Handles user authentication and profiles",
      "key_files": ["app/services/user.py"],
      "exposes_api": true,
      "connects_to": ["PostgreSQL", "Redis"]
    }
  ],

  "data_flows": [
    {
      "name": "User Authentication",
      "source": "Frontend",
      "destination": "User Service",
      "protocol": "REST",
      "description": "Login/register requests"
    }
  ],

  "business_processes": [
    {
      "name": "User Registration",
      "steps": ["Form submission", "Validation", "DB insert", "Email notification"],
      "components_involved": ["Frontend", "API", "Database", "Email Service"]
    }
  ],

  "api_surface": {
    "style": "REST|GraphQL|gRPC|mixed",
    "documented": true,
    "authentication": "JWT|OAuth|API Key|none",
    "endpoint_count": 15
  },

  "integrations": [
    {
      "name": "Stripe",
      "type": "payment",
      "direction": "outbound"
    }
  ],

  "insights": [
    "The codebase follows clean architecture patterns",
    "API versioning is implemented via URL prefix"
  ]
}
```

Be thorough but concise. Focus on information useful for diagram generation."""


def get_code_analyzer_prompt(
    repo_analysis: Dict[str, Any],
    max_key_files: int = 10,
) -> str:
    """
    Build the complete code analyzer prompt with repository data.

    Args:
        repo_analysis: RepoAnalysis dict with all parsed data
        max_key_files: Maximum number of key file contents to include

    Returns:
        Complete prompt string with repository context
    """
    prompt = CODE_ANALYZER_PROMPT

    # Add repository metadata
    prompt += "\n\n## Repository Information\n"

    repo = repo_analysis.get("repo", {})
    prompt += f"- **Name**: {repo.get('name', 'Unknown')}\n"
    prompt += f"- **Description**: {repo.get('description', 'No description')}\n"

    languages = repo_analysis.get("languages", {})
    if languages:
        lang_str = ", ".join(f"{k}: {v}" for k, v in sorted(
            languages.items(), key=lambda x: -x[1]
        )[:5])
        prompt += f"- **Languages**: {lang_str}\n"

    prompt += f"- **Primary Language**: {repo_analysis.get('primary_language', 'Unknown')}\n"
    prompt += f"- **File Count**: {repo_analysis.get('file_count', 0)}\n"
    prompt += f"- **Architecture Type (detected)**: {repo_analysis.get('architecture_type', 'unknown')}\n"

    # Add frameworks
    frameworks = repo_analysis.get("frameworks", [])
    if frameworks:
        prompt += "\n### Detected Frameworks & Technologies\n"
        for fw in frameworks[:15]:
            name = fw.get("name", fw) if isinstance(fw, dict) else fw
            category = fw.get("category", "other") if isinstance(fw, dict) else "other"
            prompt += f"- {name} ({category})\n"

    # Add dependencies
    dependencies = repo_analysis.get("dependencies", {})
    if dependencies:
        prompt += "\n### Dependencies\n"
        for source, deps in dependencies.items():
            prompt += f"**{source}**: {', '.join(deps[:20])}\n"
            if len(deps) > 20:
                prompt += f"  ...and {len(deps) - 20} more\n"

    # Add file structure
    file_tree = repo_analysis.get("file_tree", [])
    if file_tree:
        prompt += "\n### Key File Structure\n"
        prompt += "```\n"
        for f in file_tree[:50]:
            path = f.get("path", f) if isinstance(f, dict) else f
            prompt += f"{path}\n"
        if len(file_tree) > 50:
            prompt += f"... and {len(file_tree) - 50} more files\n"
        prompt += "```\n"

    # Add detected components
    components = repo_analysis.get("components", [])
    if components:
        prompt += "\n### Detected Components\n"
        for comp in components[:15]:
            name = comp.get("name", "Unknown")
            ctype = comp.get("type", comp.get("path", ""))
            prompt += f"- {name}: {ctype}\n"

    # Add API endpoints
    endpoints = repo_analysis.get("api_endpoints", [])
    if endpoints:
        prompt += "\n### API Endpoints\n"
        for ep in endpoints[:20]:
            method = ep.get("method", "GET")
            path = ep.get("path", "/")
            file = ep.get("file", "").split("/")[-1]
            prompt += f"- {method} {path} ({file})\n"

    # Add data models
    models = repo_analysis.get("data_models", [])
    if models:
        prompt += "\n### Data Models\n"
        for model in models[:15]:
            name = model.get("name", "Unknown")
            file = model.get("file", "").split("/")[-1]
            prompt += f"- {name} ({file})\n"

    # Add README
    readme = repo_analysis.get("readme_content")
    if readme:
        prompt += "\n### README (excerpt)\n"
        prompt += "```markdown\n"
        prompt += readme[:2000]
        if len(readme) > 2000:
            prompt += "\n... [truncated]"
        prompt += "\n```\n"

    # Add key file contents
    key_files = repo_analysis.get("key_files", {})
    if key_files:
        prompt += "\n### Key File Contents\n"
        count = 0
        for path, content in key_files.items():
            if count >= max_key_files:
                break
            prompt += f"\n**{path}**:\n```\n"
            # Limit each file
            if len(content) > 1500:
                prompt += content[:1500] + "\n... [truncated]"
            else:
                prompt += content
            prompt += "\n```\n"
            count += 1

    return prompt
