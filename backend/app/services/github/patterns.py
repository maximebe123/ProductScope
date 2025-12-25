"""
Framework and technology detection patterns
"""

import re
from typing import Dict, List, Optional, Tuple


# Framework detection patterns based on dependencies
FRAMEWORK_PATTERNS: Dict[str, Dict] = {
    # Frontend Frameworks
    "react": {
        "category": "frontend",
        "deps": ["react", "react-dom"],
        "files": ["*.jsx", "*.tsx"],
    },
    "next.js": {
        "category": "frontend",
        "deps": ["next"],
        "files": ["next.config.js", "next.config.mjs", "next.config.ts"],
    },
    "vue": {
        "category": "frontend",
        "deps": ["vue"],
        "files": ["*.vue"],
    },
    "nuxt": {
        "category": "frontend",
        "deps": ["nuxt"],
        "files": ["nuxt.config.js", "nuxt.config.ts"],
    },
    "angular": {
        "category": "frontend",
        "deps": ["@angular/core"],
        "files": ["angular.json"],
    },
    "svelte": {
        "category": "frontend",
        "deps": ["svelte"],
        "files": ["svelte.config.js"],
    },

    # Backend Frameworks - Python
    "fastapi": {
        "category": "backend",
        "deps": ["fastapi"],
        "patterns": [r"from fastapi import", r"@app\.(get|post|put|delete|patch)"],
    },
    "django": {
        "category": "backend",
        "deps": ["django"],
        "files": ["manage.py", "settings.py"],
        "patterns": [r"from django", r"INSTALLED_APPS"],
    },
    "flask": {
        "category": "backend",
        "deps": ["flask"],
        "patterns": [r"from flask import", r"@app\.route"],
    },

    # Backend Frameworks - Node.js
    "express": {
        "category": "backend",
        "deps": ["express"],
        "patterns": [r"require\(['\"]express['\"]\)", r"from ['\"]express['\"]"],
    },
    "nestjs": {
        "category": "backend",
        "deps": ["@nestjs/core"],
        "patterns": [r"@Controller", r"@Injectable"],
    },
    "koa": {
        "category": "backend",
        "deps": ["koa"],
    },

    # Backend Frameworks - Other
    "spring-boot": {
        "category": "backend",
        "deps": ["spring-boot-starter"],
        "patterns": [r"@SpringBootApplication", r"@RestController"],
    },
    "gin": {
        "category": "backend",
        "deps": ["github.com/gin-gonic/gin"],
        "patterns": [r"gin\.Default\(\)", r"gin\.New\(\)"],
    },
    "fiber": {
        "category": "backend",
        "deps": ["github.com/gofiber/fiber"],
    },
    "rails": {
        "category": "backend",
        "deps": ["rails"],
        "files": ["config/routes.rb", "Gemfile"],
    },
    "laravel": {
        "category": "backend",
        "deps": ["laravel/framework"],
        "files": ["artisan"],
    },

    # Databases
    "postgresql": {
        "category": "database",
        "deps": ["psycopg2", "asyncpg", "pg", "postgres"],
        "patterns": [r"postgresql://", r"postgres://"],
    },
    "mongodb": {
        "category": "database",
        "deps": ["pymongo", "mongoose", "mongodb"],
        "patterns": [r"mongodb://", r"mongodb\+srv://"],
    },
    "redis": {
        "category": "database",
        "deps": ["redis", "ioredis"],
    },
    "mysql": {
        "category": "database",
        "deps": ["mysql", "mysql2", "mysqlclient"],
    },
    "prisma": {
        "category": "database",
        "deps": ["prisma", "@prisma/client"],
        "files": ["prisma/schema.prisma"],
    },
    "sqlalchemy": {
        "category": "database",
        "deps": ["sqlalchemy"],
    },

    # Infrastructure
    "docker": {
        "category": "infrastructure",
        "files": ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"],
    },
    "kubernetes": {
        "category": "infrastructure",
        "files": ["*.yaml", "*.yml"],
        "patterns": [r"apiVersion:", r"kind:\s*(Deployment|Service|Pod)"],
    },
    "terraform": {
        "category": "infrastructure",
        "files": ["*.tf", "*.tfvars"],
    },

    # Testing
    "jest": {
        "category": "testing",
        "deps": ["jest"],
        "files": ["jest.config.js", "jest.config.ts"],
    },
    "pytest": {
        "category": "testing",
        "deps": ["pytest"],
        "patterns": [r"def test_", r"import pytest"],
    },
    "vitest": {
        "category": "testing",
        "deps": ["vitest"],
    },

    # Build Tools
    "webpack": {
        "category": "build",
        "deps": ["webpack"],
        "files": ["webpack.config.js"],
    },
    "vite": {
        "category": "build",
        "deps": ["vite"],
        "files": ["vite.config.js", "vite.config.ts"],
    },
    "esbuild": {
        "category": "build",
        "deps": ["esbuild"],
    },

    # AI/ML
    "openai": {
        "category": "ai",
        "deps": ["openai"],
    },
    "langchain": {
        "category": "ai",
        "deps": ["langchain", "langchain-core"],
    },
    "pytorch": {
        "category": "ai",
        "deps": ["torch", "pytorch"],
    },
    "tensorflow": {
        "category": "ai",
        "deps": ["tensorflow"],
    },

    # Authentication
    "auth0": {
        "category": "auth",
        "deps": ["auth0", "@auth0/auth0-react"],
    },
    "nextauth": {
        "category": "auth",
        "deps": ["next-auth"],
    },
    "passport": {
        "category": "auth",
        "deps": ["passport"],
    },
}


# API endpoint patterns for different frameworks
API_PATTERNS: Dict[str, List[Tuple[str, str]]] = {
    # Python patterns: (regex, method extraction group)
    "fastapi": [
        (r'@(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']', None),
    ],
    "flask": [
        (r'@(?:app|blueprint)\.route\s*\(\s*["\']([^"\']+)["\'](?:.*?methods\s*=\s*\[([^\]]+)\])?', None),
    ],
    "django": [
        (r'path\s*\(\s*["\']([^"\']+)["\']', None),
        (r'url\s*\(\s*r?["\']([^"\']+)["\']', None),
    ],
    # JavaScript/TypeScript patterns
    "express": [
        (r'(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["\']([^"\']+)["\']', None),
    ],
    "nestjs": [
        (r'@(Get|Post|Put|Delete|Patch)\s*\(\s*["\']?([^"\')\s]*)["\']?\s*\)', None),
    ],
}


# Data model patterns
MODEL_PATTERNS: Dict[str, List[str]] = {
    "python_dataclass": [
        r"@dataclass\s*\nclass\s+(\w+)",
    ],
    "pydantic": [
        r"class\s+(\w+)\s*\(\s*(?:Base)?Model\s*\)",
    ],
    "sqlalchemy": [
        r"class\s+(\w+)\s*\(\s*(?:Base|db\.Model)\s*\)",
    ],
    "prisma": [
        r"model\s+(\w+)\s*\{",
    ],
    "typescript_interface": [
        r"(?:export\s+)?interface\s+(\w+)\s*\{",
    ],
    "typescript_type": [
        r"(?:export\s+)?type\s+(\w+)\s*=",
    ],
}


def detect_frameworks_from_deps(
    dependencies: Dict[str, List[str]]
) -> List[Tuple[str, str, Optional[str]]]:
    """
    Detect frameworks from parsed dependencies.

    Args:
        dependencies: Dict of {source: [dep_names]}

    Returns:
        List of (framework_name, category, version)
    """
    detected = []
    all_deps = set()

    for deps in dependencies.values():
        all_deps.update(d.lower() for d in deps)

    for framework, config in FRAMEWORK_PATTERNS.items():
        framework_deps = config.get("deps", [])
        for dep in framework_deps:
            if dep.lower() in all_deps:
                detected.append((framework, config["category"], None))
                break

    return detected


def detect_frameworks_from_files(
    file_names: List[str]
) -> List[Tuple[str, str]]:
    """
    Detect frameworks from file presence.

    Args:
        file_names: List of file paths

    Returns:
        List of (framework_name, category)
    """
    detected = []
    name_set = set(f.split("/")[-1] for f in file_names)

    for framework, config in FRAMEWORK_PATTERNS.items():
        framework_files = config.get("files", [])
        for pattern in framework_files:
            if "*" in pattern:
                # Glob pattern
                ext = pattern.replace("*", "")
                if any(f.endswith(ext) for f in file_names):
                    detected.append((framework, config["category"]))
                    break
            else:
                # Exact match
                if pattern in name_set:
                    detected.append((framework, config["category"]))
                    break

    return detected


def extract_api_endpoints(
    content: str,
    file_path: str,
    framework: str,
) -> List[Dict]:
    """
    Extract API endpoints from source code.

    Args:
        content: File content
        file_path: Path for context
        framework: Detected framework

    Returns:
        List of endpoint dicts
    """
    endpoints = []
    patterns = API_PATTERNS.get(framework, [])

    for pattern, _ in patterns:
        for match in re.finditer(pattern, content, re.IGNORECASE | re.MULTILINE):
            groups = match.groups()

            if framework in ("fastapi", "express", "nestjs"):
                method = groups[0].upper()
                path = groups[1] if len(groups) > 1 else "/"
            else:
                path = groups[0]
                method = "GET"  # Default

            # Find line number
            line_num = content[:match.start()].count("\n") + 1

            endpoints.append({
                "method": method,
                "path": path,
                "file": file_path,
                "line": line_num,
            })

    return endpoints


def extract_data_models(content: str, file_path: str) -> List[Dict]:
    """
    Extract data model definitions from source code.

    Args:
        content: File content
        file_path: Path for context

    Returns:
        List of model dicts
    """
    models = []

    for model_type, patterns in MODEL_PATTERNS.items():
        for pattern in patterns:
            for match in re.finditer(pattern, content, re.MULTILINE):
                name = match.group(1)
                line_num = content[:match.start()].count("\n") + 1

                models.append({
                    "name": name,
                    "type": model_type,
                    "file": file_path,
                    "line": line_num,
                })

    return models
