"""
Repository Formatting Utilities

Shared functions for formatting repository analysis data for AI prompts.
Used by feature_discovery_streaming, feature_extraction_streaming, and kpi_discovery_streaming.
"""

import json
from typing import List, Optional


def format_file_tree(file_list: List[str], max_items: int = 100) -> str:
    """
    Format file tree for display in AI prompts.

    Args:
        file_list: List of file paths
        max_items: Maximum number of files to include

    Returns:
        Formatted file tree string
    """
    if not file_list:
        return "(empty)"
    files = file_list[:max_items]
    tree = "\n".join(files)
    if len(file_list) > max_items:
        tree += f"\n... and {len(file_list) - max_items} more files"
    return tree


def format_key_files(key_files: List[dict], max_content_length: int = 2000) -> str:
    """
    Format key files content for AI prompts.

    Args:
        key_files: List of dicts with 'path' and 'content' keys
        max_content_length: Maximum content length per file

    Returns:
        Formatted key files string
    """
    if not key_files:
        return "(no key files available)"
    parts = []
    for f in key_files:
        path = f.get("path", "unknown")
        content = f.get("content", "")
        if content:
            if len(content) > max_content_length:
                content = content[:max_content_length] + "\n... (truncated)"
            parts.append(f"### {path}\n```\n{content}\n```")
        else:
            parts.append(f"### {path}\n(content not available)")
    return "\n\n".join(parts)


def format_dependencies(
    repo_analysis: dict,
    include_dev_deps: bool = True
) -> str:
    """
    Format package dependencies from repository analysis.

    Args:
        repo_analysis: Repository analysis dict containing package_json and/or requirements_txt
        include_dev_deps: Whether to include devDependencies from package.json

    Returns:
        Formatted dependencies string
    """
    parts = []

    package_json = repo_analysis.get("package_json")
    if package_json:
        deps = package_json.get("dependencies", {})
        dev_deps = package_json.get("devDependencies", {})
        if deps:
            parts.append("### package.json dependencies")
            parts.append(json.dumps(deps, indent=2))
        if include_dev_deps and dev_deps:
            parts.append("### package.json devDependencies")
            parts.append(json.dumps(dev_deps, indent=2))

    requirements = repo_analysis.get("requirements_txt")
    if requirements:
        parts.append("### requirements.txt")
        parts.append(requirements)

    return "\n\n".join(parts) if parts else "(no dependencies found)"


def format_readme(repo_analysis: dict, max_length: int = 3000) -> str:
    """
    Format README content from repository analysis.

    Args:
        repo_analysis: Repository analysis dict
        max_length: Maximum README length

    Returns:
        Formatted README string
    """
    readme = repo_analysis.get("readme", "")
    if not readme:
        return "(no README available)"
    if len(readme) > max_length:
        return readme[:max_length] + "\n... (truncated)"
    return readme


def format_repo_context(
    repo_analysis: dict,
    max_files: int = 100,
    max_file_content: int = 2000,
    include_dev_deps: bool = True,
) -> dict:
    """
    Format complete repository context for AI prompts.

    Args:
        repo_analysis: Full repository analysis dict
        max_files: Maximum number of files in tree
        max_file_content: Maximum content length per file
        include_dev_deps: Whether to include devDependencies

    Returns:
        Dict with formatted strings for file_tree, key_files, dependencies, readme
    """
    return {
        "file_tree": format_file_tree(
            repo_analysis.get("file_tree", []),
            max_items=max_files
        ),
        "key_files": format_key_files(
            repo_analysis.get("key_files", []),
            max_content_length=max_file_content
        ),
        "dependencies": format_dependencies(
            repo_analysis,
            include_dev_deps=include_dev_deps
        ),
        "readme": format_readme(repo_analysis),
        "language": repo_analysis.get("language", "unknown"),
        "repo_name": repo_analysis.get("name", "unknown"),
        "description": repo_analysis.get("description", ""),
    }
