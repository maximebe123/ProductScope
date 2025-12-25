"""
Node Registry - Single Source of Truth

Consolidates all node type definitions for the diagram generation system.
All components should import from here instead of defining their own sets.
"""

from typing import Set, Dict, FrozenSet
from enum import Enum


class CategoryId(str, Enum):
    """Node category identifiers (7 categories for Solution Architecture)"""
    APPLICATIONS = "applications"
    DATA = "data"
    MESSAGING = "messaging"
    INTEGRATION = "integration"
    SECURITY = "security"
    OBSERVABILITY = "observability"
    EXTERNAL = "external"


class NodeTypeId(str, Enum):
    """All 39 node types available for Solution Architecture diagrams"""
    # Applications category (6)
    WEBAPP = "webapp"
    MOBILE = "mobile"
    BACKEND = "backend"
    API = "api"
    FUNCTION = "function"
    WORKER = "worker"
    # Data category (7)
    SQL = "sql"
    NOSQL = "nosql"
    KEYVALUE = "keyvalue"
    GRAPH = "graph"
    CACHE = "cache"
    STORAGE = "storage"
    DATALAKE = "datalake"
    # Messaging category (5)
    QUEUE = "queue"
    STREAM = "stream"
    PUBSUB = "pubsub"
    EVENTBUS = "eventbus"
    WEBHOOK = "webhook"
    # Integration category (6)
    GATEWAY = "gateway"
    MESH = "mesh"
    BFF = "bff"
    LOADBALANCER = "loadbalancer"
    CDN = "cdn"
    ETL = "etl"
    # Security category (5)
    IDP = "idp"
    AUTH = "auth"
    SECRETS = "secrets"
    WAF = "waf"
    CERTIFICATE = "certificate"
    # Observability category (5)
    LOGGING = "logging"
    METRICS = "metrics"
    TRACING = "tracing"
    ALERTING = "alerting"
    DASHBOARD = "dashboard"
    # External category (5)
    ACTOR = "actor"
    THIRDPARTY = "thirdparty"
    LEGACY = "legacy"
    PARTNER = "partner"
    CLOUD = "cloud"


# Derive valid node types set from enum (prevents duplication)
VALID_NODE_TYPES: FrozenSet[str] = frozenset(t.value for t in NodeTypeId)

# Node types by category for validation and UI
NODE_TYPES_BY_CATEGORY: Dict[CategoryId, FrozenSet[str]] = {
    CategoryId.APPLICATIONS: frozenset([
        "webapp", "mobile", "backend", "api", "function", "worker"
    ]),
    CategoryId.DATA: frozenset([
        "sql", "nosql", "keyvalue", "graph", "cache", "storage", "datalake"
    ]),
    CategoryId.MESSAGING: frozenset([
        "queue", "stream", "pubsub", "eventbus", "webhook"
    ]),
    CategoryId.INTEGRATION: frozenset([
        "gateway", "mesh", "bff", "loadbalancer", "cdn", "etl"
    ]),
    CategoryId.SECURITY: frozenset([
        "idp", "auth", "secrets", "waf", "certificate"
    ]),
    CategoryId.OBSERVABILITY: frozenset([
        "logging", "metrics", "tracing", "alerting", "dashboard"
    ]),
    CategoryId.EXTERNAL: frozenset([
        "actor", "thirdparty", "legacy", "partner", "cloud"
    ]),
}

# Mapping of node types to their default logical layers
NODE_TYPE_LAYERS: Dict[NodeTypeId, int] = {
    # Layer 0: External actors and systems
    NodeTypeId.ACTOR: 0,
    NodeTypeId.PARTNER: 0,
    NodeTypeId.THIRDPARTY: 0,
    NodeTypeId.LEGACY: 0,
    NodeTypeId.CLOUD: 0,
    # Layer 1: Frontend applications
    NodeTypeId.WEBAPP: 1,
    NodeTypeId.MOBILE: 1,
    NodeTypeId.CDN: 1,
    # Layer 2: Integration / Entry points
    NodeTypeId.GATEWAY: 2,
    NodeTypeId.BFF: 2,
    NodeTypeId.LOADBALANCER: 2,
    NodeTypeId.WAF: 2,
    NodeTypeId.MESH: 2,
    # Layer 3: Services & APIs
    NodeTypeId.API: 3,
    NodeTypeId.BACKEND: 3,
    NodeTypeId.FUNCTION: 3,
    NodeTypeId.WORKER: 3,
    NodeTypeId.AUTH: 3,
    NodeTypeId.IDP: 3,
    NodeTypeId.WEBHOOK: 3,
    NodeTypeId.ETL: 3,
    # Layer 4: Data & Messaging
    NodeTypeId.SQL: 4,
    NodeTypeId.NOSQL: 4,
    NodeTypeId.KEYVALUE: 4,
    NodeTypeId.GRAPH: 4,
    NodeTypeId.CACHE: 4,
    NodeTypeId.STORAGE: 4,
    NodeTypeId.DATALAKE: 4,
    NodeTypeId.QUEUE: 4,
    NodeTypeId.STREAM: 4,
    NodeTypeId.PUBSUB: 4,
    NodeTypeId.EVENTBUS: 4,
    NodeTypeId.SECRETS: 4,
    # Layer 5: Observability (cross-cutting)
    NodeTypeId.LOGGING: 5,
    NodeTypeId.METRICS: 5,
    NodeTypeId.TRACING: 5,
    NodeTypeId.ALERTING: 5,
    NodeTypeId.DASHBOARD: 5,
    NodeTypeId.CERTIFICATE: 5,
}

# Valid protocol labels for edges
VALID_PROTOCOLS: FrozenSet[str] = frozenset([
    "REST", "REST/JSON", "GraphQL", "gRPC", "gRPC/TLS",
    "WebSocket", "Socket.IO", "TCP", "TLS", "mTLS", "TLS/mTLS",
    "AMQP", "Kafka", "Redis", "Memcached",
    "PostgreSQL", "MySQL", "MongoDB", "Cassandra",
    "HTTP", "HTTPS", "HTTP/2", "QUIC",
    "S3", "GCS", "Azure Blob",
])


def validate_node_type(node_type: str) -> bool:
    """Check if a node type is valid (case-insensitive)."""
    return node_type.lower() in VALID_NODE_TYPES


def validate_protocol(protocol: str) -> bool:
    """Check if a protocol label is valid."""
    return protocol in VALID_PROTOCOLS or protocol.upper() in VALID_PROTOCOLS


def get_layer_for_node_type(node_type: str) -> int:
    """Get the default layer for a node type."""
    try:
        type_enum = NodeTypeId(node_type.lower())
        return NODE_TYPE_LAYERS.get(type_enum, 3)  # Default to layer 3
    except ValueError:
        return 3  # Default layer for unknown types
