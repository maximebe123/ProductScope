"""
GitHub API client for fetching repository data
"""

import httpx
import base64
import re
from typing import Optional, List, Dict, Tuple
from urllib.parse import urlparse

from .models import RepoInfo, FileNode, FileContent, FileType


# File extensions to analyze
ANALYZABLE_EXTENSIONS = {
    # Code files
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs", ".rb",
    ".php", ".swift", ".kt", ".cs", ".cpp", ".c", ".h", ".hpp",
    # Config files
    ".json", ".yaml", ".yml", ".toml", ".xml", ".env.example",
    # Documentation
    ".md", ".rst", ".txt",
}

# Files to always fetch
PRIORITY_FILES = {
    "README.md", "readme.md", "README", "README.rst",
    "package.json", "requirements.txt", "Pipfile", "pyproject.toml",
    "Cargo.toml", "go.mod", "pom.xml", "build.gradle",
    "docker-compose.yml", "docker-compose.yaml", "Dockerfile",
    ".env.example", "Makefile",
}

# Directories to skip
SKIP_DIRECTORIES = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", ".nuxt", "target", "vendor",
    ".idea", ".vscode", "coverage", ".pytest_cache",
}

# Maximum file size to fetch (100KB)
MAX_FILE_SIZE = 100_000

# Maximum number of files to process
MAX_FILES = 500


class GitHubError(Exception):
    """Base exception for GitHub API errors"""
    pass


class GitHubAuthError(GitHubError):
    """Authentication error"""
    pass


class GitHubRateLimitError(GitHubError):
    """Rate limit exceeded"""
    pass


class GitHubNotFoundError(GitHubError):
    """Repository not found"""
    pass


class GitHubClient:
    """
    Async client for GitHub API operations.
    Supports both public and private repositories.
    """

    def __init__(self, token: Optional[str] = None):
        """
        Initialize GitHub client.

        Args:
            token: Optional personal access token or OAuth token for private repos
        """
        self.token = token
        self.base_url = "https://api.github.com"
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def headers(self) -> Dict[str, str]:
        """Get request headers with optional auth"""
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "RDiagrams-GitHubImport/1.0",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self.headers,
                timeout=30.0,
            )
        return self._client

    async def close(self):
        """Close the HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    def parse_repo_url(self, repo_url: str) -> Tuple[str, str]:
        """
        Parse GitHub URL to extract owner and repo name.

        Args:
            repo_url: GitHub repository URL

        Returns:
            Tuple of (owner, repo_name)

        Raises:
            ValueError: If URL is not a valid GitHub repository URL
        """
        # Handle various URL formats
        # https://github.com/owner/repo
        # https://github.com/owner/repo.git
        # git@github.com:owner/repo.git
        # owner/repo

        url = repo_url.strip()

        # Remove .git suffix
        if url.endswith(".git"):
            url = url[:-4]

        # Handle SSH format
        if url.startswith("git@github.com:"):
            parts = url.replace("git@github.com:", "").split("/")
            if len(parts) >= 2:
                return parts[0], parts[1]

        # Handle HTTPS format
        if "github.com" in url:
            parsed = urlparse(url)
            path_parts = parsed.path.strip("/").split("/")
            if len(path_parts) >= 2:
                return path_parts[0], path_parts[1]

        # Handle owner/repo format
        if "/" in url and "." not in url.split("/")[0]:
            parts = url.split("/")
            if len(parts) == 2:
                return parts[0], parts[1]

        raise ValueError(
            f"Invalid GitHub URL: {repo_url}. "
            "Expected format: https://github.com/owner/repo or owner/repo"
        )

    async def _request(self, method: str, url: str, **kwargs) -> httpx.Response:
        """Make an API request with error handling"""
        client = await self._get_client()
        response = await client.request(method, url, **kwargs)

        if response.status_code == 401:
            raise GitHubAuthError("Invalid or expired token")
        elif response.status_code == 403:
            # Check if rate limited
            remaining = response.headers.get("X-RateLimit-Remaining", "1")
            if remaining == "0":
                reset_time = response.headers.get("X-RateLimit-Reset", "")
                raise GitHubRateLimitError(
                    f"Rate limit exceeded. Resets at: {reset_time}"
                )
            raise GitHubAuthError("Access forbidden. Check token permissions.")
        elif response.status_code == 404:
            raise GitHubNotFoundError("Repository not found or access denied")
        elif response.status_code >= 400:
            raise GitHubError(f"GitHub API error: {response.status_code}")

        return response

    async def fetch_repo_info(self, repo_url: str) -> RepoInfo:
        """
        Fetch repository metadata.

        Args:
            repo_url: GitHub repository URL

        Returns:
            RepoInfo with repository metadata
        """
        owner, repo = self.parse_repo_url(repo_url)

        # Fetch main repo info
        response = await self._request("GET", f"/repos/{owner}/{repo}")
        data = response.json()

        # Fetch languages
        lang_response = await self._request("GET", f"/repos/{owner}/{repo}/languages")
        languages = lang_response.json()

        return RepoInfo(
            owner=owner,
            name=repo,
            full_name=f"{owner}/{repo}",
            description=data.get("description"),
            default_branch=data.get("default_branch", "main"),
            language=data.get("language"),
            languages=languages,
            topics=data.get("topics", []),
            stars=data.get("stargazers_count", 0),
            forks=data.get("forks_count", 0),
            is_private=data.get("private", False),
            html_url=data.get("html_url", f"https://github.com/{owner}/{repo}"),
        )

    async def fetch_file_tree(
        self,
        owner: str,
        repo: str,
        branch: str = "main",
        path: str = "",
    ) -> List[FileNode]:
        """
        Fetch repository file tree recursively.

        Args:
            owner: Repository owner
            repo: Repository name
            branch: Branch name (default: main)
            path: Subdirectory path (default: root)

        Returns:
            List of FileNode objects
        """
        # Use the Git Trees API for efficient fetching
        try:
            response = await self._request(
                "GET",
                f"/repos/{owner}/{repo}/git/trees/{branch}",
                params={"recursive": "1"},
            )
            data = response.json()

            nodes = []
            for item in data.get("tree", []):
                # Skip blobs that are too large
                if item.get("size", 0) > MAX_FILE_SIZE:
                    continue

                # Skip unwanted directories
                path_parts = item["path"].split("/")
                if any(part in SKIP_DIRECTORIES for part in path_parts):
                    continue

                file_type = FileType.DIRECTORY if item["type"] == "tree" else FileType.FILE
                nodes.append(
                    FileNode(
                        path=item["path"],
                        name=path_parts[-1],
                        type=file_type,
                        size=item.get("size", 0),
                        sha=item.get("sha", ""),
                    )
                )

            return nodes

        except GitHubNotFoundError:
            # Try with 'master' if 'main' fails
            if branch == "main":
                return await self.fetch_file_tree(owner, repo, "master", path)
            raise

    async def fetch_file_content(
        self,
        owner: str,
        repo: str,
        path: str,
        branch: str = "main",
    ) -> FileContent:
        """
        Fetch content of a single file.

        Args:
            owner: Repository owner
            repo: Repository name
            path: File path in repository
            branch: Branch name

        Returns:
            FileContent with decoded content
        """
        response = await self._request(
            "GET",
            f"/repos/{owner}/{repo}/contents/{path}",
            params={"ref": branch},
        )
        data = response.json()

        # Decode base64 content
        content_b64 = data.get("content", "")
        try:
            content = base64.b64decode(content_b64).decode("utf-8")
        except (ValueError, UnicodeDecodeError):
            content = "[Binary or non-UTF-8 content]"

        # Detect language from extension
        language = self._detect_language(path)

        return FileContent(
            path=path,
            content=content,
            size=data.get("size", 0),
            language=language,
        )

    async def batch_fetch_files(
        self,
        owner: str,
        repo: str,
        paths: List[str],
        branch: str = "main",
    ) -> Dict[str, str]:
        """
        Fetch multiple files concurrently.

        Args:
            owner: Repository owner
            repo: Repository name
            paths: List of file paths
            branch: Branch name

        Returns:
            Dict mapping path to content
        """
        import asyncio

        results = {}

        async def fetch_one(path: str):
            try:
                content = await self.fetch_file_content(owner, repo, path, branch)
                results[path] = content.content
            except Exception:
                # Skip files that can't be fetched
                pass

        # Limit concurrent requests
        semaphore = asyncio.Semaphore(10)

        async def fetch_with_limit(path: str):
            async with semaphore:
                await fetch_one(path)

        await asyncio.gather(*[fetch_with_limit(p) for p in paths])
        return results

    def filter_analyzable_files(self, nodes: List[FileNode]) -> List[FileNode]:
        """
        Filter files that should be analyzed.

        Args:
            nodes: List of all file nodes

        Returns:
            Filtered list of analyzable files
        """
        result = []
        for node in nodes:
            if node.type != FileType.FILE:
                continue

            # Check if it's a priority file
            if node.name in PRIORITY_FILES:
                result.append(node)
                continue

            # Check extension
            ext = "." + node.name.split(".")[-1] if "." in node.name else ""
            if ext.lower() in ANALYZABLE_EXTENSIONS:
                result.append(node)

        # Sort: priority files first, then by path
        priority_order = {name: i for i, name in enumerate(PRIORITY_FILES)}
        result.sort(
            key=lambda n: (
                priority_order.get(n.name, 999),
                n.path,
            )
        )

        # Limit total files
        return result[:MAX_FILES]

    def _detect_language(self, path: str) -> Optional[str]:
        """Detect programming language from file extension"""
        ext_map = {
            ".py": "python",
            ".js": "javascript",
            ".ts": "typescript",
            ".tsx": "typescript",
            ".jsx": "javascript",
            ".java": "java",
            ".go": "go",
            ".rs": "rust",
            ".rb": "ruby",
            ".php": "php",
            ".swift": "swift",
            ".kt": "kotlin",
            ".cs": "csharp",
            ".cpp": "cpp",
            ".c": "c",
            ".json": "json",
            ".yaml": "yaml",
            ".yml": "yaml",
            ".md": "markdown",
            ".sql": "sql",
        }

        ext = "." + path.split(".")[-1] if "." in path else ""
        return ext_map.get(ext.lower())


# Default client instance (without auth)
github_client = GitHubClient()
