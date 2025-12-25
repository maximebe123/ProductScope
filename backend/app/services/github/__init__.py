"""
GitHub integration service for importing repositories
"""

from .client import (
    GitHubClient,
    github_client,
    GitHubError,
    GitHubAuthError,
    GitHubNotFoundError,
    GitHubRateLimitError,
)
from .models import (
    RepoInfo,
    FileNode,
    FileContent,
    RepoAnalysis,
    ImportProgress,
    DetectedFramework,
)
from .analyzer import RepositoryAnalyzer, repository_analyzer
from .import_service import GitHubImportService, github_import_service

__all__ = [
    # Client
    "GitHubClient",
    "github_client",
    "GitHubError",
    "GitHubAuthError",
    "GitHubNotFoundError",
    "GitHubRateLimitError",
    # Analyzer
    "RepositoryAnalyzer",
    "repository_analyzer",
    # Import service
    "GitHubImportService",
    "github_import_service",
    # Models
    "RepoInfo",
    "FileNode",
    "FileContent",
    "RepoAnalysis",
    "ImportProgress",
    "DetectedFramework",
]
