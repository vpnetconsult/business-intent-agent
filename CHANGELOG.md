# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-26

### Added

#### Core Services
- **Business Intent Agent** - AI-powered intent processing service using Claude Sonnet 4.5
  - REST API for customer intent processing
  - Claude AI integration for natural language understanding
  - MCP client orchestration
  - Prometheus metrics instrumentation
  - Health and readiness probes
  - Horizontal Pod Autoscaling (2-5 replicas)

- **Customer Data MCP Service** - Mock customer profile service
  - `get_customer_profile` tool implementation
  - Returns customer segments, preferences, and service history

- **BSS/OSS MCP Service** - Mock billing and product catalog service
  - `search_product_catalog` tool for product discovery
  - `generate_quote` tool for pricing and quotes
  - Telecom product data (broadband, mobile, TV)

- **Knowledge Graph MCP Service** - Mock product recommendation service
  - `find_related_products` tool for bundle recommendations
  - Product relationship logic

- **Neo4j Graph Database** - Visual knowledge graph
  - 19 nodes: Products, Bundles, Intents, Customer Segments
  - Relationship modeling: INCLUDES, MATCHES_INTENT, TARGETS_SEGMENT, COMPLEMENTS, UPGRADES_TO
  - Web browser interface for visualization
  - APOC plugin support
  - Sample telecom data populated

#### Infrastructure
- Complete Kubernetes deployment manifests
  - Namespace configuration
  - Secrets management (template provided)
  - ConfigMaps for application config
  - RBAC policies
  - Services (ClusterIP)
  - Deployments with resource limits
  - HorizontalPodAutoscaler
  - PersistentVolumeClaim for Neo4j

#### Application Code
- TypeScript implementation with strict type checking
  - Express.js REST API
  - Anthropic Claude SDK integration
  - MCP protocol client
  - Structured logging (Pino)
  - Prometheus metrics collection
  - Error handling and retry logic

- Docker multi-stage builds
  - Production-optimized images
  - Non-root user execution
  - Health checks included
  - Minimal attack surface

#### Documentation
- Comprehensive README with quick start guide
- Detailed DEPLOYMENT_SUMMARY with architecture diagrams
- Setup guides for different deployment scenarios
- Neo4j query examples
- Troubleshooting guide
- API documentation

#### Tooling
- Automated deployment scripts
- Cypher scripts for Neo4j initialization
- Docker Compose configuration (development)
- Build automation scripts

### Fixed
- Claude API JSON parsing to handle markdown code blocks
- File permissions in Docker containers (chown node:node)
- Neo4j config validation issues
- TypeScript compilation errors (noUnusedLocals, noImplicitReturns)
- Port-forward connection handling after pod restarts

### Technical Details

#### Technology Stack
- **AI/ML:** Claude Sonnet 4.5 (Anthropic API)
- **Runtime:** Node.js 20, TypeScript 5.3
- **Framework:** Express.js 4.18
- **Database:** Neo4j 5 Community Edition
- **Protocol:** MCP (Model Context Protocol)
- **Container:** Docker, Kubernetes (Kind)
- **Metrics:** Prometheus client
- **Logging:** Pino

#### Resource Allocation
- Total CPU requests: 1150m (1.15 cores)
- Total memory requests: 2Gi
- Total CPU limits: 5000m (5 cores)
- Total memory limits: 7.5Gi
- Pod count: 6 (2 business-intent-agent + 4 supporting services)

#### Performance
- End-to-end intent processing: ~14 seconds
- Claude API response time: ~2-3 seconds
- MCP service response time: <100ms
- Neo4j query time: <50ms

### Security
- Non-root container execution
- Read-only root filesystem where applicable
- Dropped all Linux capabilities
- Secret management via Kubernetes secrets
- RBAC policies configured
- Network isolation via namespaces

### Known Limitations
- MCP services are mock implementations with static data
- No persistent storage for application data (logs, cache)
- Neo4j runs single instance (not HA)
- No ingress controller configured
- Secrets stored in Kubernetes (not external vault)
- No network policies defined
- No pod security policies enforced

### Testing
- Health endpoint validation
- End-to-end intent processing flow
- All MCP service integrations
- Neo4j graph queries
- Claude AI API integration

---

[1.0.0]: https://github.com/vpnet/business-intent-agent/releases/tag/v1.0.0
