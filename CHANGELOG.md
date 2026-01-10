# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-01-10

### Added

#### Istio Service Mesh Integration

- **Service Mesh Architecture** - Complete Istio service mesh implementation
  - mTLS STRICT mode for all service-to-service communication
  - Automatic mutual TLS certificate management
  - Zero-trust network security model
  - Service identity and authentication

- **Traffic Management** - Advanced routing and resilience
  - Gateway configuration for external traffic (NodePort for local dev)
  - VirtualServices with intelligent routing rules
  - DestinationRules with load balancing strategies
    - LEAST_REQUEST for business-intent-agent (AI workload optimization)
    - ROUND_ROBIN for MCP services
  - Connection pooling and circuit breakers
  - Retry policies (3 attempts on 5xx, reset, connect-failure)
  - Timeout configurations (30s for AI requests, 10s for MCP services)
  - ServiceEntry for external Anthropic API access

- **Observability Stack** - Full distributed tracing and monitoring
  - **Kiali** - Service mesh visualization and topology (port 20001)
    - Real-time traffic flow visualization
    - mTLS status indicators
    - Configuration validation
  - **Jaeger** - Distributed tracing (port 16686)
    - End-to-end request tracing through all services
    - Latency analysis and bottleneck identification
    - 100% sampling for local development
  - **Prometheus** - Metrics collection (port 9090)
    - Default Istio metrics (request rate, latency, error rate)
    - Service-level indicators
  - **Grafana** - Pre-built dashboards (port 3000)
    - Istio Mesh Dashboard
    - Istio Service Dashboard
    - Istio Workload Dashboard

- **Telemetry Configuration**
  - Jaeger tracing integration with custom tags
  - Environment and namespace tagging
  - Prometheus metrics collection
  - Optimized metric dimensions (removed redundant custom dimensions)

- **Infrastructure Documentation**
  - Comprehensive Istio setup guide (business-intent-agent/k8s/istio/README.md)
  - Installation procedures with istioctl
  - Verification and validation steps
  - Troubleshooting runbooks
  - Performance impact analysis (~2-5ms latency per hop)
  - Resource requirements (additional 2 CPU cores, 8GB RAM)
  - Gradual rollout strategy (PERMISSIVE → STRICT mTLS)
  - Complete rollback procedures

### Changed

- **Network Security** - All services now communicate via encrypted mTLS
- **Load Balancing** - Intelligent load distribution based on workload characteristics
- **External API Access** - Anthropic API now routed through Istio with retry policies
- **Service Discovery** - Istio service registry integration
- **Telemetry** - Simplified Prometheus configuration using default Istio metrics

### Security

#### Vulnerability Fixes
- **CVE-2025-15284** - Fixed qs package DoS vulnerability
  - Updated qs to version 6.14.1 in all MCP services
  - Resolved arrayLimit bypass allowing memory exhaustion attacks
  - CVSS Score: 7.5 (High)
  - Affected services: customer-data-mcp, knowledge-graph-mcp, bss-oss-mcp
  - Fixed transitive dependency vulnerability

#### Service Mesh Security
- Implements zero-trust network architecture
- Mutual TLS for all service-to-service communication
- Certificate rotation and management via Istio CA
- Service identity validation
- Encrypted traffic by default
- Network policy enforcement via mTLS STRICT mode

### Performance

- **Latency Impact:** Additional 2-5ms per request due to sidecar processing
- **mTLS Overhead:** +0.5-1ms per connection
- **Mitigation Strategies:**
  - Connection pooling enabled
  - HTTP/2 multiplexing
  - Keep-alive connections
  - LEAST_REQUEST load balancing for variable AI latency

### Infrastructure

- **Istio Control Plane** - 7 new components in istio-system namespace
  - istiod (control plane)
  - istio-ingressgateway (NodePort: 31355)
  - istio-egressgateway
  - kiali, jaeger, prometheus, grafana
- **Sidecar Injection** - All pods now run 2/2 containers (app + envoy proxy)
- **Resource Overhead:**
  - Control plane: ~1.5 CPU cores, ~7GB RAM
  - Data plane: ~100m CPU and ~128Mi RAM per sidecar

### Operations

- **Port Forwarding** - Automated port forwarding setup for all dashboards
- **Health Checks** - Istio-aware health probes
- **Monitoring** - Real-time visibility into service mesh health
- **Configuration** - 13 Istio resource files for complete mesh configuration

## [1.1.0] - 2025-12-26

### Added

#### Security Enhancements (NIST CSF 2.0 Compliance)

- **API Authentication** - API key-based authentication for all endpoints
  - Bearer token authentication on `/api/v1/intent` endpoint
  - Customer ownership validation
  - Admin endpoint for API key generation
  - Comprehensive authentication documentation (API_AUTHENTICATION.md)

- **Secrets Management** - Removed hardcoded credentials
  - Docker Compose secrets infrastructure
  - Automated secrets setup script (`setup-secrets.sh`)
  - Template-based secret files (.txt.template)
  - PostgreSQL, Neo4j, and Grafana passwords externalized
  - Security setup documentation (SECURITY_SETUP.md)

- **PII Masking** - GDPR-compliant data anonymization
  - Automatic PII masking before sending to Claude AI
  - SHA-256 hashing for personal identifiers (name, address)
  - Removal of high-risk fields (email, phone, SSN)
  - Location generalization (street address → city/country)
  - Financial data generalization (exact credit score → tier)
  - PII validation to prevent raw data leakage
  - Comprehensive PII masking documentation (PII_MASKING.md)

- **Prompt Injection Detection** - AI jailbreak protection
  - Pattern-based detection (50+ attack signatures)
  - Three-tier severity classification (high/medium/low)
  - Automatic blocking of high-severity attacks
  - Input sanitization (HTML/script removal, Unicode normalization)
  - DoS prevention (input length limits)
  - Confidence scoring for detections
  - Comprehensive attack pattern documentation (PROMPT_INJECTION.md)

- **Security Metrics** - Prometheus instrumentation
  - `auth_success_total` - Successful authentication attempts
  - `auth_failure_total` - Failed authentication attempts
  - `prompt_injection_detections_total` - Prompt injection detections
  - `pii_masking_operations_total` - PII masking operations by field/operation

- **Dependency Management** - Supply chain security
  - Pinned all dependency versions (removed ^ and ~)
  - Added npm audit to build process
  - Created GitHub Actions workflow for security scanning
  - Trivy container vulnerability scanning
  - CodeQL static analysis
  - Dependency review for pull requests

- **Security Documentation** - Governance and compliance
  - SECURITY.md with vulnerability reporting process
  - INCIDENT_RESPONSE.md with detailed runbooks
  - API_AUTHENTICATION.md for authentication guide
  - PII_MASKING.md for data protection guide
  - PROMPT_INJECTION.md for attack prevention guide
  - SECURITY_SETUP.md for secrets management

### Changed

- **docker-compose.yml** - Uses Docker secrets instead of hardcoded passwords
- **.gitignore** - Excludes actual secret files, keeps templates
- **Kubernetes deployment** - Mounts API authentication and PII masking secrets
- **Kubernetes secrets template** - Includes DEFAULT_API_KEY, ADMIN_SECRET, and PII_HASH_SALT
- **Intent processor** - Masks customer profile before sending to Claude AI
- **API response** - Returns both original and masked profiles for transparency
- **Logging** - Automatic PII redaction in all log output

### Security

- Implements NIST CSF 2.0 PR.AC-01 (Identity and Credential Management)
- Implements NIST CSF 2.0 PR.DS-01 (Data-at-rest protection)
- Implements GDPR Article 32 (Security of Processing)
- Implements GDPR Article 5(1)(c) (Data Minimization)
- Prevents unauthorized API access
- Prevents PII exposure to third-party AI providers
- Enforces customer data isolation
- Audit logging of authentication and PII masking operations

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
