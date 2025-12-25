"""
Repository analyzer for detecting architecture, frameworks, and code patterns
"""

import json
import re
from typing import Dict, List, Optional, Any

from .client import GitHubClient
from .models import (
    RepoInfo,
    RepoAnalysis,
    FileNode,
    FileType,
    DetectedFramework,
    APIEndpoint,
    DataModel,
)
from .patterns import (
    detect_frameworks_from_deps,
    detect_frameworks_from_files,
    extract_api_endpoints,
    extract_data_models,
    FRAMEWORK_PATTERNS,
)


class RepositoryAnalyzer:
    """
    Analyzes GitHub repositories to extract architecture information
    for diagram generation.
    """

    def __init__(self, client: GitHubClient):
        """
        Initialize analyzer with GitHub client.

        Args:
            client: Configured GitHubClient instance
        """
        self.client = client

    async def analyze(self, repo_url: str) -> RepoAnalysis:
        """
        Perform complete repository analysis.

        Args:
            repo_url: GitHub repository URL

        Returns:
            RepoAnalysis with all detected information
        """
        # 1. Fetch repository info
        repo_info = await self.client.fetch_repo_info(repo_url)

        # 2. Fetch file tree
        file_tree = await self.client.fetch_file_tree(
            repo_info.owner,
            repo_info.name,
            repo_info.default_branch,
        )

        # 3. Filter analyzable files
        analyzable_files = self.client.filter_analyzable_files(file_tree)

        # 4. Identify key files to fetch
        key_file_paths = self._identify_key_files(analyzable_files)

        # 5. Fetch key file contents
        key_files = await self.client.batch_fetch_files(
            repo_info.owner,
            repo_info.name,
            key_file_paths,
            repo_info.default_branch,
        )

        # 6. Parse dependencies
        dependencies = self._parse_all_dependencies(key_files)

        # 7. Detect frameworks
        frameworks = self._detect_all_frameworks(
            dependencies,
            [f.path for f in file_tree],
            key_files,
        )

        # 8. Determine primary language
        primary_language = self._get_primary_language(repo_info.languages)

        # 9. Extract API endpoints
        api_endpoints = self._extract_all_endpoints(key_files, frameworks)

        # 10. Extract data models
        data_models = self._extract_all_models(key_files)

        # 11. Detect architecture type
        architecture_type = self._detect_architecture_type(
            file_tree,
            frameworks,
            key_files,
        )

        # 12. Identify components
        components = self._identify_components(
            file_tree,
            frameworks,
            key_files,
        )

        # 13. Get README content
        readme_content = self._get_readme(key_files)

        return RepoAnalysis(
            repo=repo_info,
            file_count=len([f for f in file_tree if f.type == FileType.FILE]),
            total_size=sum(f.size for f in file_tree),
            file_tree=analyzable_files[:100],  # Limit for response size
            languages=repo_info.languages,
            primary_language=primary_language,
            frameworks=frameworks,
            architecture_type=architecture_type,
            components=components,
            api_endpoints=api_endpoints,
            data_models=data_models,
            key_files=self._limit_key_files(key_files),
            readme_content=readme_content,
            dependencies=dependencies,
        )

    def _identify_key_files(self, files: List[FileNode]) -> List[str]:
        """Identify important files to fetch for analysis"""
        key_files = []

        # Priority patterns
        priority_patterns = [
            # Dependency files
            r"package\.json$",
            r"requirements\.txt$",
            r"Pipfile$",
            r"pyproject\.toml$",
            r"go\.mod$",
            r"Cargo\.toml$",
            r"pom\.xml$",
            r"build\.gradle$",
            r"Gemfile$",
            r"composer\.json$",
            # Config files
            r"\.env\.example$",
            r"docker-compose\.ya?ml$",
            r"Dockerfile$",
            r"Makefile$",
            # Documentation
            r"README\.md$",
            r"readme\.md$",
            # Entry points
            r"main\.(py|ts|js|go)$",
            r"app\.(py|ts|js)$",
            r"index\.(ts|js)$",
            r"server\.(py|ts|js)$",
            # API/Routes
            r"routes?\.(py|ts|js)$",
            r"api/.*\.(py|ts|js)$",
            r"controllers?/.*\.(py|ts|js)$",
            # Models
            r"models?/.*\.(py|ts|js)$",
            r"entities?/.*\.(py|ts|js)$",
            r"schema.*\.(py|ts|js|prisma)$",
            # Config
            r"config\.(py|ts|js)$",
            r"settings\.(py|ts|js)$",
        ]

        for file in files:
            for pattern in priority_patterns:
                if re.search(pattern, file.path, re.IGNORECASE):
                    key_files.append(file.path)
                    break

        # Limit to top 50 files
        return key_files[:50]

    def _parse_all_dependencies(
        self, key_files: Dict[str, str]
    ) -> Dict[str, List[str]]:
        """Parse dependencies from all package files"""
        dependencies = {}

        # package.json
        if "package.json" in key_files:
            deps = self._parse_package_json(key_files["package.json"])
            dependencies["npm"] = deps

        # requirements.txt
        for path, content in key_files.items():
            if path.endswith("requirements.txt"):
                deps = self._parse_requirements_txt(content)
                dependencies["pip"] = deps
                break

        # pyproject.toml
        for path, content in key_files.items():
            if path.endswith("pyproject.toml"):
                deps = self._parse_pyproject_toml(content)
                if deps:
                    dependencies["pip"] = deps
                break

        # go.mod
        for path, content in key_files.items():
            if path.endswith("go.mod"):
                deps = self._parse_go_mod(content)
                dependencies["go"] = deps
                break

        return dependencies

    def _parse_package_json(self, content: str) -> List[str]:
        """Parse package.json dependencies"""
        try:
            data = json.loads(content)
            deps = list(data.get("dependencies", {}).keys())
            deps.extend(data.get("devDependencies", {}).keys())
            return deps
        except (json.JSONDecodeError, AttributeError):
            return []

    def _parse_requirements_txt(self, content: str) -> List[str]:
        """Parse requirements.txt"""
        deps = []
        for line in content.split("\n"):
            line = line.strip()
            if line and not line.startswith("#") and not line.startswith("-"):
                # Extract package name (before ==, >=, etc.)
                match = re.match(r"^([a-zA-Z0-9_-]+)", line)
                if match:
                    deps.append(match.group(1))
        return deps

    def _parse_pyproject_toml(self, content: str) -> List[str]:
        """Parse pyproject.toml dependencies"""
        deps = []
        # Simple parsing - look for dependencies section
        in_deps = False
        for line in content.split("\n"):
            if "[project.dependencies]" in line or "[tool.poetry.dependencies]" in line:
                in_deps = True
                continue
            if in_deps:
                if line.startswith("["):
                    break
                match = re.match(r'^([a-zA-Z0-9_-]+)\s*=', line)
                if match:
                    deps.append(match.group(1))
                elif "=" in line:
                    # "package = version" format
                    match = re.match(r'^"?([a-zA-Z0-9_-]+)"?\s*', line)
                    if match:
                        deps.append(match.group(1))
        return deps

    def _parse_go_mod(self, content: str) -> List[str]:
        """Parse go.mod dependencies"""
        deps = []
        for line in content.split("\n"):
            if line.strip().startswith("require") or "\t" in line:
                # Extract module path
                match = re.search(r'([a-zA-Z0-9._/-]+)\s+v', line)
                if match:
                    deps.append(match.group(1))
        return deps

    def _detect_all_frameworks(
        self,
        dependencies: Dict[str, List[str]],
        file_paths: List[str],
        key_files: Dict[str, str],
    ) -> List[DetectedFramework]:
        """Detect all frameworks and technologies"""
        detected = []
        seen = set()

        # From dependencies
        for name, category, version in detect_frameworks_from_deps(dependencies):
            if name not in seen:
                detected.append(DetectedFramework(
                    name=name,
                    category=category,
                    version=version,
                ))
                seen.add(name)

        # From file presence
        for name, category in detect_frameworks_from_files(file_paths):
            if name not in seen:
                detected.append(DetectedFramework(
                    name=name,
                    category=category,
                ))
                seen.add(name)

        # From code patterns
        for path, content in key_files.items():
            for framework, config in FRAMEWORK_PATTERNS.items():
                if framework in seen:
                    continue
                patterns = config.get("patterns", [])
                for pattern in patterns:
                    if re.search(pattern, content):
                        detected.append(DetectedFramework(
                            name=framework,
                            category=config["category"],
                        ))
                        seen.add(framework)
                        break

        return detected

    def _get_primary_language(self, languages: Dict[str, int]) -> Optional[str]:
        """Determine the primary programming language"""
        if not languages:
            return None
        return max(languages.keys(), key=lambda k: languages[k])

    def _extract_all_endpoints(
        self,
        key_files: Dict[str, str],
        frameworks: List[DetectedFramework],
    ) -> List[APIEndpoint]:
        """Extract API endpoints from all source files"""
        endpoints = []
        framework_names = [f.name for f in frameworks]

        # Determine which framework patterns to use
        active_frameworks = []
        for fw in ["fastapi", "flask", "django", "express", "nestjs"]:
            if fw in framework_names:
                active_frameworks.append(fw)

        for path, content in key_files.items():
            for fw in active_frameworks:
                extracted = extract_api_endpoints(content, path, fw)
                for ep in extracted:
                    endpoints.append(APIEndpoint(
                        method=ep["method"],
                        path=ep["path"],
                        file=ep["file"],
                        line=ep.get("line", 0),
                    ))

        return endpoints

    def _extract_all_models(self, key_files: Dict[str, str]) -> List[DataModel]:
        """Extract data models from source files"""
        models = []

        for path, content in key_files.items():
            extracted = extract_data_models(content, path)
            for model in extracted:
                models.append(DataModel(
                    name=model["name"],
                    file=model["file"],
                ))

        return models

    def _detect_architecture_type(
        self,
        file_tree: List[FileNode],
        frameworks: List[DetectedFramework],
        key_files: Dict[str, str],
    ) -> str:
        """Detect the overall architecture type"""
        file_paths = [f.path for f in file_tree]
        framework_names = [f.name for f in frameworks]

        # Check for microservices indicators
        microservice_indicators = [
            "docker-compose" in " ".join(file_paths).lower(),
            any("service" in p.lower() for p in file_paths if "/" in p),
            "kubernetes" in framework_names,
            len([f for f in frameworks if f.category == "backend"]) > 1,
        ]

        if sum(microservice_indicators) >= 2:
            return "microservices"

        # Check for serverless
        serverless_indicators = [
            any(p.endswith("serverless.yml") or p.endswith("serverless.yaml")
                for p in file_paths),
            any("lambda" in p.lower() for p in file_paths),
            any("functions" in p.lower() and "/" in p for p in file_paths),
        ]

        if sum(serverless_indicators) >= 1:
            return "serverless"

        # Default to monolith
        return "monolith"

    def _identify_components(
        self,
        file_tree: List[FileNode],
        frameworks: List[DetectedFramework],
        key_files: Dict[str, str],
    ) -> List[Dict[str, Any]]:
        """Identify major components/modules"""
        components = []
        file_paths = [f.path for f in file_tree]

        # Common component directories
        component_dirs = set()
        for path in file_paths:
            parts = path.split("/")
            if len(parts) >= 2:
                # Look for src/components, app/modules, etc.
                if parts[0] in ("src", "app", "lib", "packages"):
                    if len(parts) >= 3:
                        component_dirs.add(f"{parts[0]}/{parts[1]}")
                else:
                    component_dirs.add(parts[0])

        # Filter out common non-component dirs
        skip_dirs = {
            "src", "app", "lib", "test", "tests", "__tests__",
            "docs", "scripts", "config", "public", "static",
            "assets", "styles", "types", "utils", "helpers",
        }

        for dir_path in sorted(component_dirs):
            dir_name = dir_path.split("/")[-1]
            if dir_name.lower() not in skip_dirs:
                # Count files in this component
                file_count = len([
                    f for f in file_paths
                    if f.startswith(dir_path + "/")
                ])
                if file_count >= 2:
                    components.append({
                        "name": dir_name,
                        "path": dir_path,
                        "file_count": file_count,
                    })

        # Add detected framework components
        for fw in frameworks:
            if fw.category in ("frontend", "backend", "database"):
                components.append({
                    "name": fw.name,
                    "type": fw.category,
                    "framework": True,
                })

        return components[:20]  # Limit

    def _get_readme(self, key_files: Dict[str, str]) -> Optional[str]:
        """Get README content"""
        for path in ["README.md", "readme.md", "Readme.md"]:
            if path in key_files:
                content = key_files[path]
                # Limit size
                if len(content) > 5000:
                    return content[:5000] + "\n...[truncated]"
                return content
        return None

    def _limit_key_files(
        self,
        key_files: Dict[str, str],
        max_total_size: int = 50000,
    ) -> Dict[str, str]:
        """Limit key files for response size"""
        result = {}
        total_size = 0

        # Priority: config files, then entry points, then others
        priority_order = [
            r"package\.json$",
            r"requirements\.txt$",
            r"docker-compose",
            r"main\.",
            r"app\.",
            r"config\.",
        ]

        def get_priority(path: str) -> int:
            for i, pattern in enumerate(priority_order):
                if re.search(pattern, path):
                    return i
            return 999

        sorted_files = sorted(key_files.items(), key=lambda x: get_priority(x[0]))

        for path, content in sorted_files:
            if total_size + len(content) > max_total_size:
                # Truncate this file
                remaining = max_total_size - total_size
                if remaining > 500:
                    result[path] = content[:remaining] + "\n...[truncated]"
                break

            result[path] = content
            total_size += len(content)

        return result


# Singleton instance
repository_analyzer = RepositoryAnalyzer(GitHubClient())
