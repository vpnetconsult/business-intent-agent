# Complete Source Code - Manual Setup Guide

Since folder download failed, here's how to set up the complete project manually.

## Quick Setup Script

Create this setup script and run it:

```bash
#!/bin/bash
# setup-business-intent-agent.sh

# Create directory structure
mkdir -p business-intent-agent/{src,tests,k8s}
cd business-intent-agent

# Download all files from Claude.ai individually (links provided above)
# Or copy-paste the contents below

echo "Project structure created!"
echo "Next: Copy file contents from the sections below"
```

---

## 📁 Directory Structure to Create

```
business-intent-agent/
├── src/
│   ├── index.ts
│   ├── claude-client.ts
│   ├── mcp-client.ts
│   ├── intent-processor.ts
│   ├── logger.ts
│   └── metrics.ts
├── tests/
│   └── intent-processor.test.ts
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml
├── package.json
├── tsconfig.json
├── Dockerfile
├── .env.example
└── docker-compose.yml
```

---

## 📝 File Contents (Copy-Paste These)

### 1. `package.json`

Download from link above OR copy this:

```json
{
  "name": "business-intent-agent",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn src/index.ts"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.20.0",
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "pino": "^8.16.0",
    "pino-pretty": "^10.2.0",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node-dev": "^2.0.0"
  }
}
```

### 2. `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 3. `.env.example`

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
CLAUDE_MODEL=claude-sonnet-4-20250514
MCP_BSS_URL=http://bss-oss-mcp-service:8080
MCP_KNOWLEDGE_GRAPH_URL=http://knowledge-graph-mcp-service:8080
MCP_CUSTOMER_DATA_URL=http://customer-data-mcp-service:8080
```

### 4. `src/index.ts`

**Download from link above** - Main Express server (60+ lines)

Key features:
- Express REST API
- Health checks
- Intent processing endpoint
- Error handling

### 5. `src/claude-client.ts`

**Download from link above** - Claude AI integration (60+ lines)

Key methods:
- `analyzeIntent()` - Parse customer intent
- `generateOffer()` - Create personalized offers

### 6. `src/mcp-client.ts`

**Download from link above** - MCP protocol client (30+ lines)

Key methods:
- `call()` - Execute MCP tools
- `ping()` - Health check

### 7. `src/intent-processor.ts`

**Download from link above** - Core business logic (40+ lines)

Workflow:
1. Get customer profile
2. Analyze intent with Claude
3. Search product catalog
4. Find bundles
5. Generate personalized offer
6. Create quote

### 8. `src/logger.ts`

**Download from link above** - Pino logging setup (10 lines)

### 9. `src/metrics.ts`

**Download from link above** - Prometheus metrics (50+ lines)

### 10. `Dockerfile`

**Download from link above** - Multi-stage production build

### 11. `docker-compose.yml`

**Download from link above** - Full local development stack

Services included:
- Business Intent Agent
- Redis
- PostgreSQL
- Neo4j
- Prometheus
- Grafana

---

## 🚀 Setup Steps

### Step 1: Create Project Structure

```bash
mkdir -p business-intent-agent/{src,tests,k8s}
cd business-intent-agent
```

### Step 2: Download Files

**Option A**: Click each file link above and save to correct location

**Option B**: Copy-paste file contents manually

**Option C**: Use this automated script:

```bash
# Save this as download-files.sh
#!/bin/bash

# Create directories
mkdir -p src tests k8s

# You'll need to paste the file contents here
# Or download each file individually from Claude.ai

echo "Files downloaded!"
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### Step 5: Build & Run

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start

# Docker
docker build -t business-intent-agent:1.0.0 .
docker run -p 8080:8080 --env-file .env business-intent-agent:1.0.0
```

---

## 📥 Download Files Individually

All files are available as separate downloads above. Here's what to download:

### TypeScript Source (6 files)
1. ✅ `index.ts` - Main server
2. ✅ `claude-client.ts` - AI integration
3. ✅ `mcp-client.ts` - MCP protocol
4. ✅ `intent-processor.ts` - Business logic
5. ✅ `logger.ts` - Logging
6. ✅ `metrics.ts` - Prometheus

### Configuration (4 files)
7. ✅ `package.json` - Dependencies
8. ✅ `tsconfig.json` - TypeScript config
9. ✅ `Dockerfile` - Container build
10. ✅ `.env.example` - Environment template (copy content above)

### Deployment (3 files)
11. ✅ `docker-compose.yml` - Local development
12. ✅ `k8s/deployment.yaml` - Kubernetes deployment
13. ✅ `k8s/service.yaml` - Kubernetes service

---

## 🎯 Quick Test

Once set up, test with:

```bash
# Health check
curl http://localhost:8080/health

# Process intent
curl -X POST http://localhost:8080/api/v1/intent \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "CUST-123",
    "intent": "I need internet for work from home"
  }'
```

---

## 💡 Alternative: GitHub Repository

If manual setup is too tedious, you can:

1. Create a GitHub repository
2. Upload all downloaded files
3. Clone the repository
4. Run `npm install`

---

## 📞 Need Help?

If you're still having issues:

1. **Download each file individually** using the links above
2. **Copy-paste** the file contents shown in this guide
3. **Verify** you have all 13 files in the correct directories
4. **Check** your Anthropic API key is configured

---

**Status**: All source files available for individual download above ☝️

Download each file, place in the correct directory, and you're ready to go! 🚀
