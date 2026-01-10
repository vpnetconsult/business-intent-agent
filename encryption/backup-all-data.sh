#!/bin/bash
# Complete data backup before encryption migration
# Part of Phase 2 Security Hardening: Encryption at Rest
#
# This is a CRITICAL safety net - DO NOT skip this step!

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
echo "  - Neo4j database dump"
echo "  - All Kubernetes resources"
echo "  - All secrets"
echo "  - etcd snapshot"
echo ""

read -p "Proceed with backup? (yes/no): " PROCEED
if [ "$PROCEED" != "yes" ]; then
    echo "Backup cancelled."
    exit 1
fi

mkdir -p "$BACKUP_ROOT"

# 1. Backup Neo4j database
echo ""
echo -e "${GREEN}[1/6] Backing up Neo4j database...${NC}"
NEO4J_POD=$(kubectl get pod -n intent-platform -l app=neo4j -o jsonpath='{.items[0].metadata.name}')

if [ -z "$NEO4J_POD" ]; then
    echo -e "${RED}ERROR: Neo4j pod not found!${NC}"
    exit 1
fi

echo "Neo4j pod: $NEO4J_POD"

# Create database dump
kubectl exec -n intent-platform "$NEO4J_POD" -- \
    neo4j-admin database dump neo4j --to-path=/tmp/neo4j-backup.dump || {
    echo -e "${YELLOW}WARNING: Neo4j dump command failed. Trying alternative method...${NC}"
    # Alternative: Export as cypher queries
    kubectl exec -n intent-platform "$NEO4J_POD" -- \
        cypher-shell -u neo4j -p password123 \
        "CALL apoc.export.cypher.all('/tmp/neo4j-export.cypher', {format:'cypher-shell'});"
}

# Copy dump to local machine
kubectl cp "intent-platform/$NEO4J_POD:/tmp/neo4j-backup.dump" \
    "$BACKUP_ROOT/neo4j-backup.dump" 2>/dev/null || \
kubectl cp "intent-platform/$NEO4J_POD:/tmp/neo4j-export.cypher" \
    "$BACKUP_ROOT/neo4j-export.cypher"

echo "✓ Neo4j backup complete"

# 2. Backup all Kubernetes resources
echo ""
echo -e "${GREEN}[2/6] Backing up Kubernetes resources...${NC}"
kubectl get all -n intent-platform -o yaml > "$BACKUP_ROOT/k8s-resources.yaml"
kubectl get pvc -n intent-platform -o yaml > "$BACKUP_ROOT/k8s-pvcs.yaml"
kubectl get configmaps -n intent-platform -o yaml > "$BACKUP_ROOT/k8s-configmaps.yaml"
kubectl get serviceaccounts -n intent-platform -o yaml > "$BACKUP_ROOT/k8s-serviceaccounts.yaml"
kubectl get roles,rolebindings -n intent-platform -o yaml > "$BACKUP_ROOT/k8s-rbac.yaml"
echo "✓ Kubernetes resources backup complete"

# 3. Backup all secrets
echo ""
echo -e "${GREEN}[3/6] Backing up secrets...${NC}"
kubectl get secrets -n intent-platform -o yaml > "$BACKUP_ROOT/secrets.yaml"
kubectl get secrets -n kube-system -o yaml > "$BACKUP_ROOT/secrets-kube-system.yaml"
echo "✓ Secrets backup complete"

# 4. Backup Istio configurations
echo ""
echo -e "${GREEN}[4/6] Backing up Istio configurations...${NC}"
kubectl get gateway,virtualservices,destinationrules,peerauthentication,serviceentry,telemetry \
    -n intent-platform -o yaml > "$BACKUP_ROOT/istio-configs.yaml" 2>/dev/null || \
    echo "  (Istio not configured, skipping)"

# 5. Backup etcd snapshot
echo ""
echo -e "${GREEN}[5/6] Backing up etcd snapshot...${NC}"
kubectl -n kube-system exec etcd-local-k8s-control-plane -- \
    etcdctl snapshot save /tmp/etcd-backup.db \
    --endpoints=https://127.0.0.1:2379 \
    --cert=/etc/kubernetes/pki/etcd/peer.crt \
    --key=/etc/kubernetes/pki/etcd/peer.key \
    --cacert=/etc/kubernetes/pki/etcd/ca.crt 2>/dev/null || {
    echo -e "${YELLOW}  WARNING: etcd snapshot failed (might not have permissions)${NC}"
    echo "  This is optional but recommended for full cluster recovery"
}

# Copy etcd snapshot if successful
kubectl -n kube-system cp \
    "etcd-local-k8s-control-plane:/tmp/etcd-backup.db" \
    "$BACKUP_ROOT/etcd-snapshot.db" 2>/dev/null && \
    echo "✓ etcd snapshot complete" || \
    echo "  etcd snapshot skipped"

# 6. Create backup manifest
echo ""
echo -e "${GREEN}[6/6] Creating backup manifest...${NC}"
cat > "$BACKUP_ROOT/BACKUP_MANIFEST.md" <<EOF
# Pre-Migration Backup Manifest

**Backup Date:** $BACKUP_DATE
**Backup Purpose:** Phase 2 Encryption at Rest Migration

## Contents

### Database Backups
- \`neo4j-backup.dump\` or \`neo4j-export.cypher\` - Neo4j database dump
  - Expected nodes: ~19 (products, bundles, intents, segments)
  - Format: Neo4j dump or Cypher export

### Kubernetes Resources
- \`k8s-resources.yaml\` - All deployments, services, pods
- \`k8s-pvcs.yaml\` - Persistent Volume Claims
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

### etcd
- \`etcd-snapshot.db\` - etcd database snapshot (optional)
  - Full cluster state backup
  - Can restore entire cluster if needed

## Restoration Instructions

### Quick Restore (if migration fails)

\`\`\`bash
# 1. Restore Neo4j
kubectl cp $BACKUP_ROOT/neo4j-backup.dump \\
    intent-platform/\$(kubectl get pod -n intent-platform -l app=neo4j -o jsonpath='{.items[0].metadata.name}'):/tmp/

kubectl exec -n intent-platform deployment/neo4j -- \\
    neo4j-admin database load neo4j --from-path=/tmp/neo4j-backup.dump --overwrite-destination=true

# 2. Restore Kubernetes resources (if needed)
kubectl apply -f $BACKUP_ROOT/k8s-resources.yaml

# 3. Restore secrets (if needed)
kubectl apply -f $BACKUP_ROOT/secrets.yaml
\`\`\`

### Full Cluster Restore (disaster recovery)

\`\`\`bash
# Restore etcd snapshot (requires cluster admin)
kubectl -n kube-system cp \\
    $BACKUP_ROOT/etcd-snapshot.db \\
    etcd-local-k8s-control-plane:/tmp/

kubectl -n kube-system exec etcd-local-k8s-control-plane -- \\
    etcdctl snapshot restore /tmp/etcd-snapshot.db \\
    --data-dir=/var/lib/etcd-restore
\`\`\`

## Verification

Check this backup is complete:
\`\`\`bash
cd $BACKUP_ROOT

# Check Neo4j backup exists
[ -f neo4j-backup.dump ] || [ -f neo4j-export.cypher ] && echo "✓ Neo4j" || echo "✗ Neo4j MISSING"

# Check Kubernetes resources
[ -f k8s-resources.yaml ] && echo "✓ K8s resources" || echo "✗ K8s resources MISSING"

# Check secrets
[ -f secrets.yaml ] && echo "✓ Secrets" || echo "✗ Secrets MISSING"

# Count lines to ensure files aren't empty
wc -l *.yaml
\`\`\`

## Security Notes

- **DELETE secrets.yaml files after migration verification** (they contain plaintext credentials)
- Store encrypted backup in secure location
- Keep backup for 90 days minimum
- This manifest should be included in encrypted backup

EOF

# 7. Verify backup contents
echo ""
echo -e "${GREEN}Verifying backup...${NC}"
cd "$BACKUP_ROOT"

BACKUP_VALID=true

# Check Neo4j backup
if [ -f neo4j-backup.dump ] || [ -f neo4j-export.cypher ]; then
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

# 8. Create encrypted archive
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
    echo "  2. Test restore procedure (optional but recommended)"
    echo "  3. Store encrypted archive in secure location (1Password, AWS S3)"
    echo "  4. Proceed with Day 1: Kubernetes etcd Encryption"
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
