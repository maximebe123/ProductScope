"""
GitHub service data models
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class FileType(str, Enum):
    FILE = "file"
    DIRECTORY = "dir"


class FileNode(BaseModel):
    """Represents a file or directory in the repository"""
    path: str
    name: str
    type: FileType
    size: int = 0
    sha: str = ""
    download_url: Optional[str] = None


class FileContent(BaseModel):
    """File content with metadata"""
    path: str
    content: str
    size: int
    language: Optional[str] = None


class RepoInfo(BaseModel):
    """Repository metadata"""
    owner: str
    name: str
    full_name: str
    description: Optional[str] = None
    default_branch: str = "main"
    language: Optional[str] = None
    languages: Dict[str, int] = Field(default_factory=dict)
    topics: List[str] = Field(default_factory=list)
    stars: int = 0
    forks: int = 0
    is_private: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    html_url: str = ""


class DetectedFramework(BaseModel):
    """Detected framework or technology"""
    name: str
    category: str  # frontend, backend, database, infrastructure, etc.
    version: Optional[str] = None
    confidence: float = 1.0


class APIEndpoint(BaseModel):
    """Detected API endpoint"""
    method: str  # GET, POST, etc.
    path: str
    file: str
    line: int = 0
    description: Optional[str] = None


class DataModel(BaseModel):
    """Detected data model/entity"""
    name: str
    file: str
    fields: List[Dict[str, str]] = Field(default_factory=list)
    relationships: List[str] = Field(default_factory=list)


class RepoAnalysis(BaseModel):
    """Complete repository analysis result"""
    repo: RepoInfo

    # File analysis
    file_count: int = 0
    total_size: int = 0
    file_tree: List[FileNode] = Field(default_factory=list)

    # Technology detection
    languages: Dict[str, int] = Field(default_factory=dict)
    primary_language: Optional[str] = None
    frameworks: List[DetectedFramework] = Field(default_factory=list)

    # Architecture analysis
    architecture_type: Optional[str] = None  # monolith, microservices, serverless
    components: List[Dict[str, Any]] = Field(default_factory=list)

    # API surface
    api_endpoints: List[APIEndpoint] = Field(default_factory=list)

    # Data models
    data_models: List[DataModel] = Field(default_factory=list)

    # Key files content (for AI analysis)
    key_files: Dict[str, str] = Field(default_factory=dict)

    # README content
    readme_content: Optional[str] = None

    # Dependencies
    dependencies: Dict[str, List[str]] = Field(default_factory=dict)


class ImportProgress(BaseModel):
    """Progress update for SSE streaming"""
    stage: str  # fetching, analyzing, planning, creating, generating, complete
    message: str
    progress: int  # 0-100
    details: Optional[Dict[str, Any]] = None
