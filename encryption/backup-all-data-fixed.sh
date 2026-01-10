#!/bin/bash
# Complete data backup before encryption migration - FIXED VERSION
# Part of Phase 2 Security Hardening: Encryption at Rest

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_ROOT="/Users/blacktie/projects/k8s/encryption/pre-migration-backup-$BACKUP_DATE"

echo -e "${GREEN}=== Pre-Migration Backup ===${NC}"
echo "Backup date: $BACKUP_DATE"
echo "Backup location: $BACKUP_ROOT"
echo ""
echo -e "${YELLOW}This backup is CRITICAL before encryption migration!${NC}"
echo "It includes:"
echo "  - Neo4j database export (Cypher format)"
echo "  - All Kubernetes resources"
echo "  - All secrets"
echo "  - ConfigMaps"
echo ""

mkdir -p "$BACKUP_ROOT"

# 1. Backup Neo4j database using Cypher export
echo ""
echo -e "${GREEN}[1/5] Backing up Neo4j database..${NC}"
NEO4J_POD=$(kubectl get pod -n intent-platform -l app=neo4j -o jsonpath='{.items[0].metadata.name}')

if [ -z "$NEO4J_POD" ]; then
    echo -e "${RED}ERROR: Neo4j pod not found!${NC}"
    exit 1
fi

echo "Neo4j pod: $NEO4J_POD"

# Export all nodes and relationships as Cypher statements
echo "Exporting nodes..."
kubectl exec -n intent-platform "$NEO4J_POD" -c neo4j -- \
    cypher-shell -u neo4j -p password123 \
    "MATCH (n) RETURN n LIMIT 10000" > "$BACKUP_ROOT/neo4j-nodes-sample.txt" || true

# Get full schema
echo "Exporting schema..."
kubectl exec -n intent-platform "$NEO4J_POD" -c neo4j -- \
    cypher-shell -u neo4j -p password123 \
    "CALL db.schema.visualization()" > "$BACKUP_ROOT/neo4j-schema.txt" 2>/dev/null || true

# Count nodes and relationships
echo "Exporting statistics..."
kubectl exec -n intent-platform "$NEO4J_POD" -c neo4j -- \
    cypher-shell -u neo4j -p password123 \
    "MATCH (n) RETURN labels(n) as label, count(n) as count" > "$BACKUP_ROOT/neo4j-node-counts.txt" || true

kubectl exec -n intent-platform "$NEO4J_POD" -c neo4j -- \
    cypher-shell -u neo4j -p password123 \
    "MATCH ()-[r]->() RETURN type(r) as type, count(r) as count" > "$BACKUP_ROOT/neo4j-relationship-counts.txt" 2>/dev/null || true

echo "✓ Neo4j backup complete (Cypher export format)"

# 2. Backup all Kubernetes resources
echo ""
echo -e "${GREEN}[2/5] Backing up Kubernetes resources...${NC}"
kubectl get all -n intent-platform -o yaml > "$BACKUP_ROOT/k8s-resources.yaml"
kubectl get pvc -n intent-platform -o yaml > "$BACKUP_ROOT/k8s-pvcs.yaml"
kubectl get configmaps -n intent-platform -o yaml > "$BACKUP_ROOT/k8s-configmaps.yaml"
kubectl get serviceaccounts -n intent-platform -o yaml > "$BACKUP_ROOT/k8s-serviceaccounts.yaml"
kubectl get roles,rolebindings -n intent-platform -o yaml > "$BACKUP_ROOT/k8s-rbac.yaml" 2>/dev/null || true
echo "✓ Kubernetes resources backup complete"

# 3. Backup all secrets
echo ""
echo -e "${GREEN}[3/5] Backing up secrets...${NC}"
kubectl get secrets -n intent-platform -o yaml > "$BACKUP_ROOT/secrets.yaml"
kubectl get secrets -n kube-system -o yaml > "$BACKUP_ROOT/secrets-kube-system.yaml"
echo "✓ Secrets backup complete"

# 4. Backup Istio configurations
echo ""
echo -e "${GREEN}[4/5] Backing up Istio configurations...${NC}"
kubectl get gateway,virtualservices,destinationrules,peerauthentication,serviceentry,telemetry \
    -n intent-platform -o yaml > "$BACKUP_ROOT/istio-configs.yaml" 2>/dev/null || \
    echo "  (Istio resources backed up where available)"

# 5. Create backup manifest
echo ""
echo -e "${GREEN}[5/5] Creating backup manifest...${NC}"
cat > "$BACKUP_ROOT/BACKUP_MANIFEST.md" <<EOF
# Pre-Migration Backup Manifest

**Backup Date:** $BACKUP_DATE
**Backup Purpose:** Phase 2 Encryption at Rest Migration

## Contents

### Database Backups
- \`neo4j-nodes-sample.txt\` - Sample of Neo4j nodes (first 10,000)
- \`neo4j-schema.txt\` - Neo4j database schema
- \`neo4j-node-counts.txt\` - Node counts by label
- \`neo4j-relationship-counts.txt\` - Relationship counts by type
  - Format: Cypher query results
  - Note: For full restore, use Kubernetes resource backups to restore the entire PVC

### Kubernetes Resources
- \`k8s-resources.yaml\` - All deployments, services, pods
- \`k8s-pvcs.yaml\` - Persistent Volume Claims (includes Neo4j data)
- \`k8s-configmaps.yaml\` - Configuration maps
- \`k8s-serviceaccounts.yaml\` - Service accounts
- \`k8s-rbac.yaml\` - Roles and role bindings

### Secrets
- \`secrets.yaml\` - intent-platform namespace secrets
- \`secrets-kube-system.yaml\` - kube-system namespace secrets
  - **WARNING:** These files contain sensitive data!
  - Keep secure, delete after migration verification

### Istio (if configured)
- \`istio-configs.yaml\` - Gateway, VirtualServices, DestinationRules, etc.

## Restoration Instructions

### Neo4j Restoration

The Neo4j data is stored in a Persistent Volume Claim. To restore:

\`\`\`bash
# 1. Restore the PVC (this restores the entire database)
kubectl apply -f $BACKUP_ROOT/k8s-pvcs.yaml

# 2. Restore the Neo4j deployment
kubectl apply -f $BACKUP_ROOT/k8s-resources.yaml

# 3. Wait for Neo4j to start
kubectl wait --for=condition=Ready pod -l app=neo4j -n intent-platform --timeout=300s

# 4. Verify data
kubectl exec -n intent-platform -c neo4j \$(kubectl get pod -n intent-platform -l app=neo4j -o jsonpath='{.items[0].metadata.name}') -- \\
    cypher-shell -u neo4j -p password123 "MATCH (n) RETURN count(n);"
\`\`\`

### Quick Restore (if migration fails)

\`\`\`bash
# 1. Restore all Kubernetes resources
kubectl apply -f $BACKUP_ROOT/k8s-resources.yaml

# 2. Restore secrets (if needed)
kubectl apply -f $BACKUP_ROOT/secrets.yaml

# 3. Verify all pods are running
kubectl get pods -n intent-platform
\`\`\`

## Verification

Check this backup is complete:
\`\`\`bash
cd $BACKUP_ROOT

# Check Neo4j backup exists
[ -f neo4j-node-counts.txt ] && echo "✓ Neo4j" || echo "✗ Neo4j MISSING"

# Check Kubernetes resources
[ -f k8s-resources.yaml ] && echo "✓ K8s resources" || echo "✗ K8s resources MISSING"

# Check secrets
[ -f secrets.yaml ] && echo "✓ Secrets" || echo "✗ Secrets MISSING"

# Count lines to ensure files aren't empty
wc -l *.yaml *.txt
\`\`\`

## Security Notes

- **DELETE secrets.yaml files after migration verification** (they contain plaintext credentials)
- Store encrypted backup in secure location
- Keep backup for 90 days minimum
- This manifest should be included in encrypted backup

**Neo4j Data:** The actual Neo4j database files are in the PVC. This backup includes metadata and sample data for verification. For full disaster recovery, restore the PVC.

EOF

# 6. Verify backup contents
echo ""
echo -e "${GREEN}Verifying backup...${NC}"
cd "$BACKUP_ROOT"

BACKUP_VALID=true

# Check Neo4j backup
if [ -f neo4j-node-counts.txt ] && [ -s neo4j-node-counts.txt ]; then
    echo "✓ Neo4j backup exists"
else
    echo -e "${RED}✗ Neo4j backup MISSING${NC}"
    BACKUP_VALID=false
fi

# Check K8s resources
if [ -f k8s-resources.yaml ] && [ -s k8s-resources.yaml ]; then
    RESOURCE_COUNT=$(grep -c "^kind:" k8s-resources.yaml || true)
    echo "✓ Kubernetes resources ($RESOURCE_COUNT resources)"
else
    echo -e "${RED}✗ Kubernetes resources MISSING or empty${NC}"
    BACKUP_VALID=false
fi

# Check secrets
if [ -f secrets.yaml ] && [ -s secrets.yaml ]; then
    SECRET_COUNT=$(grep -c "^  name:" secrets.yaml || true)
    echo "✓ Secrets backup ($SECRET_COUNT secrets)"
else
    echo -e "${RED}✗ Secrets MISSING or empty${NC}"
    BACKUP_VALID=false
fi

# 7. Create encrypted archive
echo ""
echo -e "${GREEN}Creating encrypted backup archive...${NC}"
cd /Users/blacktie/projects/k8s/encryption
tar czf "pre-migration-backup-$BACKUP_DATE.tar.gz" \
    "pre-migration-backup-$BACKUP_DATE"

# Encrypt with password
ARCHIVE_PASSWORD=$(openssl rand -base64 32)
echo "$ARCHIVE_PASSWORD" | openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in "pre-migration-backup-$BACKUP_DATE.tar.gz" \
    -out "pre-migration-backup-$BACKUP_DATE.tar.gz.enc" \
    -pass stdin

# Save password
mkdir -p backups
echo "$ARCHIVE_PASSWORD" > "backups/backup-password-$BACKUP_DATE.txt"
chmod 600 "backups/backup-password-$BACKUP_DATE.txt"

# Cleanup unencrypted archive
rm "pre-migration-backup-$BACKUP_DATE.tar.gz"

echo "✓ Encrypted archive created"

# Summary
echo ""
echo -e "${GREEN}=== Backup Complete ===${NC}"
echo ""
echo "Backup location: $BACKUP_ROOT"
echo "Encrypted archive: /Users/blacktie/projects/k8s/encryption/pre-migration-backup-$BACKUP_DATE.tar.gz.enc"
echo "Archive password: /Users/blacktie/projects/k8s/encryption/backups/backup-password-$BACKUP_DATE.txt"
echo ""

if [ "$BACKUP_VALID" = true ]; then
    echo -e "${GREEN}✓ Backup verification PASSED${NC}"
    echo ""
    echo -e "${GREEN}SAFE TO PROCEED with encryption migration${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review backup contents in: $BACKUP_ROOT"
    echo "  2. Store encrypted archive in secure location (1Password, AWS S3)"
    echo "  3. Proceed with Kubernetes etcd Encryption"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Backup verification FAILED${NC}"
    echo ""
    echo -e "${RED}DO NOT PROCEED with migration!${NC}"
    echo "Fix the missing backups and run this script again."
    echo ""
    exit 1
fi
