/**
 * Node type configurations for Solution Architecture diagrams
 * 39 node types organized by 7 categories
 */

import {
  // Applications
  AppWindow,
  Smartphone,
  Server,
  Globe,
  Zap,
  Cog,
  // Data
  Database,
  FileJson,
  Key,
  Network,
  HardDrive,
  Archive,
  Waves,
  // Messaging
  Layers,
  Radio,
  Bell,
  GitBranch,
  Webhook,
  // Integration
  DoorOpen,
  Grid3x3,
  Layers2,
  Scale,
  Cloud,
  ArrowLeftRight,
  // Security
  Fingerprint,
  Shield,
  KeyRound,
  ShieldCheck,
  FileKey,
  // Observability
  FileText,
  BarChart3,
  Activity,
  AlertTriangle,
  LayoutDashboard,
  // External
  User,
  ExternalLink,
  Building,
  Handshake,
  CloudCog,
} from 'lucide-react'

import type { NodeTypeId, NodeTypeConfig } from './types'

// All node type configurations (39 types)
export const nodeTypes: Record<NodeTypeId, NodeTypeConfig> = {
  // ==========================================
  // Applications (6 nodes)
  // ==========================================
  webapp: {
    id: 'webapp',
    category: 'applications',
    label: 'Web App',
    icon: AppWindow,
    description: 'Web application frontend (React, Vue, Angular)',
    defaultLabel: 'Web App',
  },
  mobile: {
    id: 'mobile',
    category: 'applications',
    label: 'Mobile App',
    icon: Smartphone,
    description: 'Mobile application (iOS, Android, Flutter)',
    defaultLabel: 'Mobile App',
  },
  backend: {
    id: 'backend',
    category: 'applications',
    label: 'Backend Service',
    icon: Server,
    description: 'Backend service / microservice',
    defaultLabel: 'Backend',
  },
  api: {
    id: 'api',
    category: 'applications',
    label: 'API',
    icon: Globe,
    description: 'REST, GraphQL, or gRPC API endpoint',
    defaultLabel: 'API',
  },
  function: {
    id: 'function',
    category: 'applications',
    label: 'Serverless Function',
    icon: Zap,
    description: 'Serverless function (Lambda, Cloud Functions)',
    defaultLabel: 'Function',
  },
  worker: {
    id: 'worker',
    category: 'applications',
    label: 'Background Worker',
    icon: Cog,
    description: 'Background job processor',
    defaultLabel: 'Worker',
  },

  // ==========================================
  // Data (7 nodes)
  // ==========================================
  sql: {
    id: 'sql',
    category: 'data',
    label: 'SQL Database',
    icon: Database,
    description: 'Relational database (PostgreSQL, MySQL)',
    defaultLabel: 'SQL Database',
  },
  nosql: {
    id: 'nosql',
    category: 'data',
    label: 'Document DB',
    icon: FileJson,
    description: 'NoSQL document store (MongoDB, Firestore)',
    defaultLabel: 'Document DB',
  },
  keyvalue: {
    id: 'keyvalue',
    category: 'data',
    label: 'Key-Value Store',
    icon: Key,
    description: 'Key-value database (Redis, DynamoDB)',
    defaultLabel: 'Key-Value',
  },
  graph: {
    id: 'graph',
    category: 'data',
    label: 'Graph Database',
    icon: Network,
    description: 'Graph database (Neo4j, Neptune)',
    defaultLabel: 'Graph DB',
  },
  cache: {
    id: 'cache',
    category: 'data',
    label: 'Cache',
    icon: HardDrive,
    description: 'In-memory cache (Redis, Memcached)',
    defaultLabel: 'Cache',
  },
  storage: {
    id: 'storage',
    category: 'data',
    label: 'Object Storage',
    icon: Archive,
    description: 'Object/file storage (S3, GCS, Azure Blob)',
    defaultLabel: 'Storage',
  },
  datalake: {
    id: 'datalake',
    category: 'data',
    label: 'Data Lake',
    icon: Waves,
    description: 'Data lake / warehouse (Snowflake, BigQuery)',
    defaultLabel: 'Data Lake',
  },

  // ==========================================
  // Messaging (5 nodes)
  // ==========================================
  queue: {
    id: 'queue',
    category: 'messaging',
    label: 'Message Queue',
    icon: Layers,
    description: 'Message queue (RabbitMQ, SQS, ActiveMQ)',
    defaultLabel: 'Queue',
  },
  stream: {
    id: 'stream',
    category: 'messaging',
    label: 'Event Stream',
    icon: Radio,
    description: 'Event streaming (Kafka, Kinesis, Pulsar)',
    defaultLabel: 'Stream',
  },
  pubsub: {
    id: 'pubsub',
    category: 'messaging',
    label: 'Pub/Sub',
    icon: Bell,
    description: 'Publish-subscribe (SNS, Pub/Sub, NATS)',
    defaultLabel: 'Pub/Sub',
  },
  eventbus: {
    id: 'eventbus',
    category: 'messaging',
    label: 'Event Bus',
    icon: GitBranch,
    description: 'Event bus (EventBridge, Dapr)',
    defaultLabel: 'Event Bus',
  },
  webhook: {
    id: 'webhook',
    category: 'messaging',
    label: 'Webhook',
    icon: Webhook,
    description: 'HTTP callback / webhook endpoint',
    defaultLabel: 'Webhook',
  },

  // ==========================================
  // Integration (6 nodes)
  // ==========================================
  gateway: {
    id: 'gateway',
    category: 'integration',
    label: 'API Gateway',
    icon: DoorOpen,
    description: 'API gateway (Kong, AWS API Gateway)',
    defaultLabel: 'Gateway',
  },
  mesh: {
    id: 'mesh',
    category: 'integration',
    label: 'Service Mesh',
    icon: Grid3x3,
    description: 'Service mesh (Istio, Linkerd, Consul)',
    defaultLabel: 'Service Mesh',
  },
  bff: {
    id: 'bff',
    category: 'integration',
    label: 'BFF',
    icon: Layers2,
    description: 'Backend for Frontend pattern',
    defaultLabel: 'BFF',
  },
  loadbalancer: {
    id: 'loadbalancer',
    category: 'integration',
    label: 'Load Balancer',
    icon: Scale,
    description: 'Load balancer (ALB, nginx, HAProxy)',
    defaultLabel: 'Load Balancer',
  },
  cdn: {
    id: 'cdn',
    category: 'integration',
    label: 'CDN',
    icon: Cloud,
    description: 'Content delivery network (CloudFront, Cloudflare)',
    defaultLabel: 'CDN',
  },
  etl: {
    id: 'etl',
    category: 'integration',
    label: 'ETL Pipeline',
    icon: ArrowLeftRight,
    description: 'Data transformation / ETL (Airflow, dbt)',
    defaultLabel: 'ETL',
  },

  // ==========================================
  // Security (5 nodes)
  // ==========================================
  idp: {
    id: 'idp',
    category: 'security',
    label: 'Identity Provider',
    icon: Fingerprint,
    description: 'Identity provider (Auth0, Okta, Keycloak)',
    defaultLabel: 'IdP',
  },
  auth: {
    id: 'auth',
    category: 'security',
    label: 'Auth Service',
    icon: Shield,
    description: 'Authentication/authorization service',
    defaultLabel: 'Auth',
  },
  secrets: {
    id: 'secrets',
    category: 'security',
    label: 'Secret Manager',
    icon: KeyRound,
    description: 'Secrets management (Vault, AWS Secrets Manager)',
    defaultLabel: 'Secrets',
  },
  waf: {
    id: 'waf',
    category: 'security',
    label: 'WAF',
    icon: ShieldCheck,
    description: 'Web application firewall',
    defaultLabel: 'WAF',
  },
  certificate: {
    id: 'certificate',
    category: 'security',
    label: 'Certificate',
    icon: FileKey,
    description: 'SSL/TLS certificate management',
    defaultLabel: 'Certificate',
  },

  // ==========================================
  // Observability (5 nodes)
  // ==========================================
  logging: {
    id: 'logging',
    category: 'observability',
    label: 'Logging',
    icon: FileText,
    description: 'Log aggregation (ELK, Datadog, Loki)',
    defaultLabel: 'Logging',
  },
  metrics: {
    id: 'metrics',
    category: 'observability',
    label: 'Metrics',
    icon: BarChart3,
    description: 'Metrics collection (Prometheus, Grafana)',
    defaultLabel: 'Metrics',
  },
  tracing: {
    id: 'tracing',
    category: 'observability',
    label: 'Tracing',
    icon: Activity,
    description: 'Distributed tracing (Jaeger, Zipkin, X-Ray)',
    defaultLabel: 'Tracing',
  },
  alerting: {
    id: 'alerting',
    category: 'observability',
    label: 'Alerting',
    icon: AlertTriangle,
    description: 'Alerting system (PagerDuty, Opsgenie)',
    defaultLabel: 'Alerting',
  },
  dashboard: {
    id: 'dashboard',
    category: 'observability',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Observability dashboard (Grafana, Datadog)',
    defaultLabel: 'Dashboard',
  },

  // ==========================================
  // External (5 nodes)
  // ==========================================
  actor: {
    id: 'actor',
    category: 'external',
    label: 'Actor',
    icon: User,
    description: 'End user / human actor',
    defaultLabel: 'Actor',
  },
  thirdparty: {
    id: 'thirdparty',
    category: 'external',
    label: 'External Service',
    icon: ExternalLink,
    description: 'Third-party SaaS (Stripe, Twilio)',
    defaultLabel: 'External',
  },
  legacy: {
    id: 'legacy',
    category: 'external',
    label: 'Legacy System',
    icon: Building,
    description: 'Legacy / on-premises system',
    defaultLabel: 'Legacy',
  },
  partner: {
    id: 'partner',
    category: 'external',
    label: 'Partner API',
    icon: Handshake,
    description: 'B2B partner integration',
    defaultLabel: 'Partner',
  },
  cloud: {
    id: 'cloud',
    category: 'external',
    label: 'Cloud Provider',
    icon: CloudCog,
    description: 'Cloud provider service (AWS, GCP, Azure)',
    defaultLabel: 'Cloud',
  },
}
