#!/bin/bash
# Business Intent Agent - Secrets Setup Script
# Generates secure random passwords for all services
# Part of NIST CSF 2.0 security compliance initiative

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="$SCRIPT_DIR/secrets"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Business Intent Agent - Secrets Setup               ║"
echo "║  NIST CSF 2.0 Compliant Credential Management        ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if secrets directory exists
if [ ! -d "$SECRETS_DIR" ]; then
    echo -e "${RED}✗ Error: Secrets directory not found at $SECRETS_DIR${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  This will generate new random passwords for all services.${NC}"
echo -e "${YELLOW}⚠️  Existing passwords will be OVERWRITTEN.${NC}"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}✗ Aborted by user${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Generating secure passwords...${NC}"

# Function to generate secure password
generate_password() {
    # Generate 32-byte random password (base64 encoded = ~44 characters)
    openssl rand -base64 32 | tr -d '\n'
}

# Generate passwords
POSTGRES_PASSWORD=$(generate_password)
NEO4J_PASSWORD=$(generate_password)
GRAFANA_PASSWORD=$(generate_password)

# Write to files
echo -n "$POSTGRES_PASSWORD" > "$SECRETS_DIR/postgres_password.txt"
echo -n "$NEO4J_PASSWORD" > "$SECRETS_DIR/neo4j_password.txt"
echo -n "$GRAFANA_PASSWORD" > "$SECRETS_DIR/grafana_password.txt"

# Set restrictive permissions (owner read/write only)
chmod 600 "$SECRETS_DIR"/*.txt

echo -e "${GREEN}✓ Secret files created successfully${NC}"
echo ""

# Verify files exist
if [ -f "$SECRETS_DIR/postgres_password.txt" ] && \
   [ -f "$SECRETS_DIR/neo4j_password.txt" ] && \
   [ -f "$SECRETS_DIR/grafana_password.txt" ]; then
    echo -e "${GREEN}✓ All secret files verified${NC}"
else
    echo -e "${RED}✗ Error: Some secret files were not created${NC}"
    exit 1
fi

# Display file permissions
echo ""
echo -e "${BLUE}File Permissions:${NC}"
ls -lh "$SECRETS_DIR"/*.txt | awk '{print "  " $1, $9}' | grep -v template

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Secrets Setup Complete                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}📋 Generated Credentials:${NC}"
echo ""
echo -e "${BLUE}PostgreSQL:${NC}"
echo "  Database: intent_db"
echo "  Username: intent_user"
echo "  Password: $POSTGRES_PASSWORD"
echo ""
echo -e "${BLUE}Neo4j:${NC}"
echo "  URL: http://localhost:7474"
echo "  Username: neo4j"
echo "  Password: $NEO4J_PASSWORD"
echo ""
echo -e "${BLUE}Grafana:${NC}"
echo "  URL: http://localhost:3000"
echo "  Username: admin"
echo "  Password: $GRAFANA_PASSWORD"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY REMINDERS:${NC}"
echo "  1. Store these passwords in a secure password manager"
echo "  2. Do NOT commit secrets/*.txt files to version control"
echo "  3. Rotate credentials every 90 days"
echo "  4. Never share credentials via email or chat"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Save the credentials above to your password manager"
echo "  2. Run: ${BLUE}docker-compose up -d${NC}"
echo "  3. Verify services are running: ${BLUE}docker-compose ps${NC}"
echo ""
echo -e "${BLUE}For more information, see: SECURITY_SETUP.md${NC}"
echo ""
