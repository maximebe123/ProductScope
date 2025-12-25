"""
Connection Expert Agent Prompt

Defines edges between components with protocol labels.
Uses GPT-5-mini for fast, pattern-based edge creation.
"""

from typing import List
from app.core.ai.agent_state import ComponentSpec

CONNECTION_PROMPT = """You are a connection expert defining edges between architecture components.

## Your Task
Create connections between components with appropriate protocol labels.

## Protocol Labels (REQUIRED)

### HTTP-based
| Protocol | When to Use |
|----------|-------------|
| REST | Standard REST APIs |
| REST/JSON | JSON over HTTP |
| GraphQL | GraphQL endpoints |
| HTTP | Generic HTTP calls |
| HTTPS | Secure HTTP |

### RPC & Real-time
| Protocol | When to Use |
|----------|-------------|
| gRPC | High-performance RPC |
| gRPC/TLS | Secure gRPC |
| WebSocket | Bidirectional real-time |
| Socket.IO | Socket.IO connections |

### Database
| Protocol | When to Use |
|----------|-------------|
| PostgreSQL | PostgreSQL connections |
| MySQL | MySQL connections |
| MongoDB | MongoDB wire protocol |
| Redis | Redis protocol |
| Memcached | Memcached protocol |

### Messaging
| Protocol | When to Use |
|----------|-------------|
| AMQP | RabbitMQ protocol |
| Kafka | Kafka protocol |
| MQTT | IoT messaging |

### Security
| Protocol | When to Use |
|----------|-------------|
| TLS | Encrypted connections |
| mTLS | Mutual TLS |
| TCP | Raw TCP |

## Connection Patterns

1. **Frontend to Backend**: REST/JSON, GraphQL
2. **Backend to Database**: PostgreSQL, MongoDB, Redis
3. **Backend to Cache**: Redis, Memcached
4. **Service to Service**: gRPC, REST
5. **Service to Queue**: AMQP, Kafka
6. **External to Gateway**: HTTPS

## CRITICAL RULES

1. **Every edge MUST have a protocol label**
2. **No orphan nodes** - every non-external node should have at least one connection
3. **Direction matters** - source initiates, target receives
4. **Match technology** - use PostgreSQL for PostgreSQL DB, not "SQL"

## Output Format
Return a JSON array of connections. Each connection must have:
- id: Unique edge ID (edge_0, edge_1, etc.)
- source: Source node ID
- target: Target node ID
- label: Protocol label (from the tables above)
- rationale: Brief explanation of this connection"""


def get_connection_prompt(components: List[ComponentSpec]) -> str:
    """
    Build the connection prompt with component list.

    Args:
        components: List of components from Component Specialist

    Returns:
        Complete prompt string
    """
    prompt = CONNECTION_PROMPT

    prompt += "\n\n## Components to Connect\n"
    prompt += "```json\n"

    # Format components as simple list
    comp_list = []
    for comp in components:
        comp_list.append({
            "id": comp.id,
            "nodeType": comp.nodeType,
            "label": comp.label,
            "tags": comp.tags,
            "layer": comp.suggested_layer
        })

    import json
    prompt += json.dumps(comp_list, indent=2)
    prompt += "\n```\n"

    # Add hints based on component types
    prompt += "\n## Connection Hints\n"

    # Find components by type
    has_frontend = any(c.nodeType in ["webapp", "mobile"] for c in components)
    has_backend = any(c.nodeType in ["backend", "api"] for c in components)
    has_db = any(c.nodeType in ["sql", "nosql", "keyvalue"] for c in components)
    has_cache = any(c.nodeType == "cache" for c in components)
    has_queue = any(c.nodeType in ["queue", "stream"] for c in components)
    has_gateway = any(c.nodeType == "gateway" for c in components)

    if has_frontend and has_backend:
        prompt += "- Connect frontends to backends/APIs via REST or GraphQL\n"
    if has_backend and has_db:
        prompt += "- Connect backends to databases with appropriate DB protocol\n"
    if has_cache:
        prompt += "- Connect services that need caching to cache nodes via Redis\n"
    if has_queue:
        prompt += "- Connect producers to queues and queues to consumers\n"
    if has_gateway:
        prompt += "- Route external traffic through the gateway first\n"

    return prompt
