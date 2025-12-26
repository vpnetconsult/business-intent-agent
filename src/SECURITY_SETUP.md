# Security Setup Guide

This guide explains how to configure secure credentials for the Business Intent Agent system.

## ⚠️ IMPORTANT: Security Changes (NIST CSF 2.0 Compliance)

As of v1.1.0, hardcoded credentials have been **REMOVED** from `docker-compose.yml` to comply with NIST CSF 2.0 security requirements. You **MUST** configure secrets before running the application.

## Quick Setup

### Option 1: Automated Setup (Recommended)

```bash
cd src
./setup-secrets.sh
```

This script will:
1. Generate secure random passwords
2. Create all required secret files
3. Set correct file permissions (600 - owner read/write only)
4. Display the generated credentials

### Option 2: Manual Setup

1. **Copy template files:**
   ```bash
   cd src/secrets
   cp postgres_password.txt.template postgres_password.txt
   cp neo4j_password.txt.template neo4j_password.txt
   cp grafana_password.txt.template grafana_password.txt
   ```

2. **Edit each file and replace placeholder text with secure passwords:**
   ```bash
   # Example: Generate secure passwords
   openssl rand -base64 32 > postgres_password.txt
   openssl rand -base64 32 > neo4j_password.txt
   openssl rand -base64 32 > grafana_password.txt
   ```

3. **Set correct permissions:**
   ```bash
   chmod 600 *.txt
   ```

## Docker Secrets Architecture

### How It Works

Docker Compose mounts secret files into containers at `/run/secrets/<secret_name>`:

```
Host filesystem          →  Container filesystem
./secrets/postgres_password.txt  →  /run/secrets/postgres_password
./secrets/neo4j_password.txt     →  /run/secrets/neo4j_password
./secrets/grafana_password.txt   →  /run/secrets/grafana_password
```

### Services Using Secrets

| Service | Secret | Environment Variable | Location |
|---------|--------|---------------------|----------|
| PostgreSQL | `postgres_password` | `POSTGRES_PASSWORD_FILE` | `/run/secrets/postgres_password` |
| Neo4j | `neo4j_password` | `NEO4J_AUTH` | `/run/secrets/neo4j_password` |
| Grafana | `grafana_password` | `GF_SECURITY_ADMIN_PASSWORD__FILE` | `/run/secrets/grafana_password` |

## Security Best Practices

### ✅ DO:
- Use strong passwords (minimum 32 characters)
- Use unique passwords for each service
- Rotate credentials every 90 days
- Store secrets in a password manager
- Use `setup-secrets.sh` for automated secure generation
- Keep secret files with 600 permissions (owner read/write only)

### ❌ DON'T:
- Commit `secrets/*.txt` files to version control (they're in .gitignore)
- Share credentials via email or chat
- Use default/weak passwords like "password123"
- Reuse passwords across services
- Store credentials in environment variables in production

## Accessing Services

After setting up secrets, access services with the generated credentials:

### PostgreSQL
```bash
# Connect to database
docker exec -it postgres psql -U intent_user -d intent_db
# Password: (contents of secrets/postgres_password.txt)
```

### Neo4j Browser
```bash
# Open http://localhost:7474
# Username: neo4j
# Password: (contents of secrets/neo4j_password.txt)
```

### Grafana
```bash
# Open http://localhost:3000
# Username: admin
# Password: (contents of secrets/grafana_password.txt)
```

## Troubleshooting

### Error: "No such file or directory: ./secrets/postgres_password.txt"

**Solution:** Run `./setup-secrets.sh` or manually create secret files as described above.

### Error: "Permission denied reading /run/secrets/postgres_password"

**Solution:**
```bash
chmod 600 secrets/*.txt
```

### Error: Docker Compose fails to start

**Solution:**
1. Verify all secret files exist:
   ```bash
   ls -la src/secrets/*.txt
   ```
2. Ensure no trailing whitespace in secret files
3. Check Docker Compose logs:
   ```bash
   docker-compose logs
   ```

## Production Deployment

### Kubernetes

For Kubernetes deployments, secrets are managed differently:

```bash
# Create Kubernetes secrets from files
kubectl create secret generic postgres-credentials \
  --from-file=password=./secrets/postgres_password.txt \
  -n intent-platform

kubectl create secret generic neo4j-credentials \
  --from-file=password=./secrets/neo4j_password.txt \
  -n intent-platform

kubectl create secret generic grafana-credentials \
  --from-file=password=./secrets/grafana_password.txt \
  -n intent-platform
```

### External Secret Management (Recommended)

For production, use external secret managers:

- **HashiCorp Vault** - Enterprise secret management
- **AWS Secrets Manager** - AWS native solution
- **Azure Key Vault** - Azure native solution
- **Google Secret Manager** - GCP native solution

## Credential Rotation

### Recommended Rotation Schedule

| Secret | Rotation Period | Priority |
|--------|----------------|----------|
| PostgreSQL password | 90 days | HIGH |
| Neo4j password | 90 days | HIGH |
| Grafana admin password | 90 days | MEDIUM |
| Anthropic API key | On compromise | CRITICAL |

### Rotation Procedure

1. **Generate new password:**
   ```bash
   openssl rand -base64 32 > secrets/postgres_password_new.txt
   ```

2. **Update Docker secret:**
   ```bash
   # Backup old secret
   cp secrets/postgres_password.txt secrets/postgres_password_old.txt

   # Replace with new
   mv secrets/postgres_password_new.txt secrets/postgres_password.txt
   ```

3. **Restart service:**
   ```bash
   docker-compose up -d --force-recreate postgres
   ```

4. **Verify connectivity:**
   ```bash
   docker exec -it postgres psql -U intent_user -d intent_db
   ```

5. **Delete old secret:**
   ```bash
   shred -u secrets/postgres_password_old.txt  # Secure deletion
   ```

## Compliance

This secrets management approach addresses:

- ✅ **NIST CSF 2.0** - GV.RM-04 (Risk response)
- ✅ **OWASP Top 10** - A02:2021 (Cryptographic Failures)
- ✅ **CIS Controls** - Control 3.3 (Secure configuration)
- ✅ **GDPR** - Article 32 (Security of processing)

## Support

For security-related questions:
- Email: security@vpnet.consulting
- Incident Response: Follow INCIDENT_RESPONSE.md

---

**Last Updated:** December 26, 2025
**Applies To:** Business Intent Agent v1.1.0+
**Classification:** INTERNAL USE ONLY
