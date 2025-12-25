"""
Code Analyzer Agent Prompt for Feature Extraction

Analyzes the repository structure to identify EXISTING implemented features.
"""

CODE_ANALYZER_SYSTEM = """You are an expert software architect analyzing a GitHub repository.
Your goal is to thoroughly understand what features are ALREADY IMPLEMENTED in the codebase.

You excel at:
- Identifying API endpoints and their functionality
- Understanding UI components and their purposes
- Recognizing business logic modules and services
- Finding authentication/authorization implementations
- Detecting data management and CRUD operations
- Identifying integration points with external services

IMPORTANT: You are NOT discovering new features - you are cataloging what ALREADY EXISTS.
Focus only on implemented, working functionality."""

CODE_ANALYZER_PROMPT = """Analyze this GitHub repository to identify all EXISTING, IMPLEMENTED features.

## Repository Information
- **Owner/Repo**: {owner}/{repo_name}
- **Branch**: {branch}
- **Primary Language**: {language}
- **Description**: {description}

## Topics/Tags
{topics}

## File Structure
```
{file_tree}
```

## README Content
{readme_content}

## Key Files Content
{key_files_content}

## Package Dependencies
{dependencies}

{user_context_section}

## Your Task
Analyze this repository to catalog ALL existing, implemented features.

Focus on:
1. **API Endpoints**: Routes, handlers, and their operations
2. **UI Components**: Pages, views, interactive elements
3. **Business Logic**: Services, controllers, domain logic
4. **Data Operations**: CRUD, queries, data transformations
5. **Authentication**: Login, signup, permissions, roles
6. **Integrations**: External APIs, third-party services
7. **Utilities**: Export, import, notifications, etc.

## Output Format
Return a JSON object with the following structure:
```json
{{
    "architecture_type": "monolith|microservices|serverless|hybrid|...",
    "primary_domain": "what this project does (e.g., 'diagram editor', 'e-commerce')",
    "tech_stack": {{
        "frontend": ["React", "TypeScript", "..."],
        "backend": ["FastAPI", "Python", "..."],
        "database": ["PostgreSQL", "Redis", "..."],
        "other": ["Docker", "AWS", "..."]
    }},
    "modules": [
        {{
            "name": "module name",
            "type": "api|ui|service|utility",
            "purpose": "what this module does",
            "files": ["path/to/file.py", "..."]
        }}
    ],
    "api_endpoints": [
        {{
            "method": "GET|POST|PUT|DELETE",
            "path": "/api/endpoint",
            "purpose": "what this endpoint does"
        }}
    ],
    "ui_pages": [
        {{
            "name": "page name",
            "route": "/route",
            "purpose": "what this page does"
        }}
    ],
    "identified_features": [
        {{
            "name": "Feature name",
            "type": "api|ui|background|integration",
            "description": "Brief description of what it does",
            "location": ["file1.py", "file2.tsx"]
        }}
    ]
}}
```

Be THOROUGH. Identify every distinct user-facing capability in the codebase.
Remember: ONLY report what is actually implemented, not what could be added."""
