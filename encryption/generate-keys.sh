#!/bin/bash
# Generate secure encryption keys for Kubernetes etcd and storage encryption
# Part of Phase 2 Security Hardening: Encryption at Rest

set -e

ENCRYPTION_DIR="/Users/blacktie/projects/k8s/encryption"
BACKUP_DIR="$ENCRYPTION_DIR/backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Encryption Key Generation ===${NC}"
echo "This script generates secure encryption keys for:"
echo "  1. Kubernetes etcd encryption (AESCBC)"
echo "  2. LUKS storage encryption passphrase"
echo "  3. Database encryption keys"
echo ""

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if keys already exist
if [ -f "$ENCRYPTION_DIR/etcd-encryption-key.txt" ]; then
    echo -e "${YELLOW}WARNING: Encryption keys already exist!${NC}"
    echo "Existing keys found at: $ENCRYPTION_DIR/"
    read -p "Do you want to rotate keys? (yes/no): " ROTATE_KEYS
    if [ "$ROTATE_KEYS" != "yes" ]; then
        echo "Aborting. Use existing keys or manually delete them first."
        exit 1
    fi

    # Backup existing keys
    BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
    echo "Backing up existing keys to: $BACKUP_DIR/keys-backup-$BACKUP_DATE/"
    mkdir -p "$BACKUP_DIR/keys-backup-$BACKUP_DATE"
    cp -r "$ENCRYPTION_DIR"/*.txt "$BACKUP_DIR/keys-backup-$BACKUP_DATE/" 2>/dev/null || true
fi

# 1. Generate etcd encryption key (32-byte for AESCBC)
echo ""
echo -e "${GREEN}[1/4] Generating etcd encryption key (AESCBC)...${NC}"
ETCD_KEY=$(head -c 32 /dev/urandom | base64)
echo "$ETCD_KEY" > "$ENCRYPTION_DIR/etcd-encryption-key.txt"
chmod 600 "$ENCRYPTION_DIR/etcd-encryption-key.txt"
echo "✓ etcd encryption key saved: $ENCRYPTION_DIR/etcd-encryption-key.txt"

# 2. Generate LUKS storage encryption passphrase
echo ""
echo -e "${GREEN}[2/4] Generating LUKS storage encryption passphrase...${NC}"
LUKS_PASSPHRASE=$(openssl rand -base64 32)
echo "$LUKS_PASSPHRASE" > "$ENCRYPTION_DIR/luks-passphrase.txt"
chmod 600 "$ENCRYPTION_DIR/luks-passphrase.txt"
echo "✓ LUKS passphrase saved: $ENCRYPTION_DIR/luks-passphrase.txt"

# 3. Generate database encryption keys
echo ""
echo -e "${GREEN}[3/4] Generating database encryption keys...${NC}"

# Neo4j encryption key
NEO4J_KEY=$(openssl rand -base64 32)
echo "$NEO4J_KEY" > "$ENCRYPTION_DIR/neo4j-encryption-key.txt"
chmod 600 "$ENCRYPTION_DIR/neo4j-encryption-key.txt"
echo "✓ Neo4j key saved: $ENCRYPTION_DIR/neo4j-encryption-key.txt"

# PostgreSQL encryption key (for pgcrypto)
POSTGRESQL_KEY=$(openssl rand -base64 32)
echo "$POSTGRESQL_KEY" > "$ENCRYPTION_DIR/postgresql-encryption-key.txt"
chmod 600 "$ENCRYPTION_DIR/postgresql-encryption-key.txt"
echo "✓ PostgreSQL key saved: $ENCRYPTION_DIR/postgresql-encryption-key.txt"

# Redis encryption key
REDIS_KEY=$(openssl rand -base64 32)
echo "$REDIS_KEY" > "$ENCRYPTION_DIR/redis-encryption-key.txt"
chmod 600 "$ENCRYPTION_DIR/redis-encryption-key.txt"
echo "✓ Redis key saved: $ENCRYPTION_DIR/redis-encryption-key.txt"

# 4. Create key rotation metadata
echo ""
echo -e "${GREEN}[4/4] Creating key rotation metadata...${NC}"
cat > "$ENCRYPTION_DIR/key-metadata.json" <<EOF
{
  "version": "v1",
  "created_at": "$(date -Iseconds)",
  "last_rotation": "$(date -Iseconds)",
  "next_rotation_due": "$(date -v+90d -Iseconds 2>/dev/null || date -d '+90 days' -Iseconds)",
  "keys": {
    "etcd": {
      "algorithm": "AESCBC",
      "key_size": "256",
      "rotation_frequency": "90 days"
    },
    "storage": {
      "algorithm": "LUKS (aes-xts-plain64)",
      "key_size": "512",
      "rotation_frequency": "365 days"
    },
    "databases": {
      "neo4j": "AES-256",
      "postgresql": "pgcrypto AES-256",
      "redis": "Password authentication"
    }
  }
}
EOF
echo "✓ Metadata saved: $ENCRYPTION_DIR/key-metadata.json"

# 5. Create encrypted backup of all keys
echo ""
echo -e "${GREEN}Creating encrypted backup of all keys...${NC}"
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/encryption-keys-$BACKUP_DATE.tar.gz.enc"

# Create tar archive
tar czf /tmp/keys-backup.tar.gz -C "$ENCRYPTION_DIR" \
    etcd-encryption-key.txt \
    luks-passphrase.txt \
    neo4j-encryption-key.txt \
    postgresql-encryption-key.txt \
    redis-encryption-key.txt \
    key-metadata.json

# Encrypt with AES-256-CBC using a password
BACKUP_PASSWORD=$(openssl rand -base64 32)
echo "$BACKUP_PASSWORD" | openssl enc -aes-256-cbc -salt -pbkdf2 \
    -in /tmp/keys-backup.tar.gz \
    -out "$BACKUP_FILE" \
    -pass stdin

# Save backup password separately
echo "$BACKUP_PASSWORD" > "$BACKUP_DIR/backup-password-$BACKUP_DATE.txt"
chmod 600 "$BACKUP_DIR/backup-password-$BACKUP_DATE.txt"

# Cleanup temp file
rm /tmp/keys-backup.tar.gz

echo "✓ Encrypted backup created: $BACKUP_FILE"
echo "✓ Backup password: $BACKUP_DIR/backup-password-$BACKUP_DATE.txt"

# Summary
echo ""
echo -e "${GREEN}=== Key Generation Complete ===${NC}"
echo ""
echo "Generated keys:"
echo "  1. etcd encryption: $ENCRYPTION_DIR/etcd-encryption-key.txt"
echo "  2. LUKS passphrase: $ENCRYPTION_DIR/luks-passphrase.txt"
echo "  3. Neo4j key: $ENCRYPTION_DIR/neo4j-encryption-key.txt"
echo "  4. PostgreSQL key: $ENCRYPTION_DIR/postgresql-encryption-key.txt"
echo "  5. Redis key: $ENCRYPTION_DIR/redis-encryption-key.txt"
echo ""
echo "Backup:"
echo "  Encrypted backup: $BACKUP_FILE"
echo "  Backup password: $BACKUP_DIR/backup-password-$BACKUP_DATE.txt"
echo ""
echo -e "${YELLOW}IMPORTANT SECURITY NOTES:${NC}"
echo "  1. All key files have 600 permissions (owner read/write only)"
echo "  2. Store encrypted backup in secure location (1Password, AWS S3, etc.)"
echo "  3. NEVER commit these files to git (added to .gitignore)"
echo "  4. Key rotation due: $(date -v+90d +%Y-%m-%d 2>/dev/null || date -d '+90 days' +%Y-%m-%d)"
echo "  5. Backup password is required to decrypt key backup"
echo ""
echo -e "${RED}WARNING: Loss of these keys means loss of all encrypted data!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review encryption/encryption-config.yaml template"
echo "  2. Run: ./encryption/backup-all-data.sh (backup existing data)"
echo "  3. Follow Day 1 implementation steps in the plan"
echo ""
