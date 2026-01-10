# Neo4j Encryption at Rest - Community Edition Limitation

## Status: PARTIAL IMPLEMENTATION

### Issue

**Neo4j Community Edition 5.x does not support native encryption at rest.**

Native database encryption at rest is only available in **Neo4j Enterprise Edition** with the following features:
- Transparent database encryption
- Hardware security module (HSM) integration
- Encrypted backup and restore
- Key rotation support

### What WE HAVE Implemented

✅ **Layer 1: Kubernetes Secrets Encryption**
- All Neo4j credentials (passwords, connection strings) are encrypted in etcd using AESCBC
- Secret: `neo4j-encryption-key` created in `intent-platform` namespace
- This protects credentials at rest in the Kubernetes cluster

✅ **Layer 2: Data in Transit**
- Neo4j bolt:// connections are encrypted with TLS (if configured)
- Kubernetes network policies can restrict access

### What is NOT Encrypted

⚠️ **Neo4j Database Files on Disk**
- The actual Neo4j database files in the PersistentVolume are stored in **plaintext**
- Customer data (Products, Bundles, Intents, Segments) is not encrypted at rest in the database
- Database dumps/backups are in plaintext unless separately encrypted

### Risk Assessment

**Current Risk Level:** MEDIUM

**Exposure:**
- If an attacker gains access to the PersistentVolume, they can read the Neo4j database files directly
- Stolen database dumps would contain plaintext customer data
- Mitigated by: etcd encryption (protects secrets), Kubernetes RBAC (limits PV access), network policies

**Data at Risk:**
- 19 nodes (6 Products, 4 Bundles, 6 Intents, 3 Segments)
- Customer profile data
- Business logic and relationships

### Recommended Solutions

#### Option 1: Upgrade to Neo4j Enterprise Edition (RECOMMENDED)
**Cost:** ~$5,000/year per deployment
**Benefit:** Native transparent database encryption, HSM integration, encrypted backups

```yaml
# Example Neo4j Enterprise configuration
env:
  - name: NEO4J_dbms_security_encryption_provider
    value: "AES256"
  - name: NEO4J_dbms_security_encryption_keystore__path
    value: "/var/lib/neo4j/certificates/keystore.jks"
  - name: NEO4J_ENCRYPTION_KEY
    valueFrom:
      secretKeyRef:
        name: neo4j-encryption-key
        key: encryption-key
```

#### Option 2: Infrastructure-Level Encryption
**Cost:** Depends on cloud provider
**Benefit:** Encrypts the entire PersistentVolume at the storage layer

**AWS EBS:**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-gp3
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  encrypted: "true"
  kmsKeyId: "arn:aws:kms:region:account-id:key/key-id"
```

**Google Cloud:**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  disk-encryption-kms-key: "projects/PROJECT/locations/LOCATION/keyRings/RING/cryptoKeys/KEY"
```

**Azure:**
```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: encrypted-disk
provisioner: disk.csi.azure.com
parameters:
  skuName: Premium_LRS
  encryption: "EncryptionAtRestWithCustomerKey"
  diskEncryptionSetID: "/subscriptions/SUB/resourceGroups/RG/providers/Microsoft.Compute/diskEncryptionSets/SET"
```

#### Option 3: Application-Level Encryption
**Cost:** Development time (~$3,000)
**Benefit:** Encrypt sensitive fields before storing in Neo4j

```typescript
// Example: Encrypt sensitive fields before storing
import { createCipheriv, createDecipheriv } from 'crypto';

function encryptField(text: string, key: string): string {
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

// Store encrypted
await session.run(
  'CREATE (c:Customer {email: $email, name: $name})',
  {
    email: encryptField(email, encryptionKey),
    name: encryptField(name, encryptionKey)
  }
);
```

#### Option 4: LUKS File System Encryption (Development Only)
**Cost:** Free, but complex
**Benefit:** Encrypts the underlying file system

```bash
# Create encrypted volume (Linux only)
cryptsetup luksFormat /dev/sdX
cryptsetup luksOpen /dev/sdX neo4j-encrypted
mkfs.ext4 /dev/mapper/neo4j-encrypted
mount /dev/mapper/neo4j-encrypted /var/lib/neo4j/data
```

**Note:** Not practical for Kind/Docker Desktop environments.

### Decision Matrix

| Solution | Cost | Effort | Security | Production Ready |
|----------|------|--------|----------|------------------|
| Neo4j Enterprise | $5K/year | Low | ⭐⭐⭐⭐⭐ | ✅ Yes |
| Cloud PV Encryption | $0-500/year | Low | ⭐⭐⭐⭐ | ✅ Yes |
| Application-Level | $3K one-time | High | ⭐⭐⭐ | ⚠️ Partial |
| LUKS Encryption | $0 | Very High | ⭐⭐⭐⭐ | ❌ No (complex) |

### Current Implementation Status

**Phase 2 Encryption at Rest - Neo4j Component:**

✅ **Completed:**
- Kubernetes secrets encrypted (AESCBC in etcd)
- Neo4j encryption key generated and stored securely
- Backup procedures documented
- Risk assessment completed

⚠️ **Partial (Community Edition Limitation):**
- Neo4j database files NOT encrypted at rest
- Alternative solutions documented

❌ **Not Implemented:**
- Native Neo4j database encryption (requires Enterprise Edition)
- Encrypted PersistentVolumes (requires production cloud infrastructure)

### Recommendation for Production

**For production deployments handling sensitive customer data:**

1. **Upgrade to Neo4j Enterprise Edition** ($5K/year)
   - Provides comprehensive encryption at rest
   - Includes encrypted backups
   - Supports key rotation
   - Industry-standard solution

2. **OR use Cloud Provider Encrypted Storage** ($0-500/year)
   - AWS EBS encryption with KMS
   - Google Cloud Persistent Disk encryption
   - Azure Disk Encryption
   - Transparent to application, minimal overhead

3. **AND keep Kubernetes secrets encryption** (DONE)
   - Protects credentials and connection strings
   - Already implemented in Phase 2

### Compliance Impact

**GDPR Article 32 (Security of Processing):**
- ✅ Kubernetes secrets encrypted (credentials protected)
- ⚠️ Database files not encrypted (customer data at risk if PV is compromised)
- **Recommendation:** Implement Option 1 or 2 for full compliance

**NIST CSF 2.0 PR.DS-01 (Data-at-rest protection):**
- ✅ Partial implementation (secrets layer)
- ⚠️ Application data layer not encrypted
- **Target:** Move from TIER 2.5 to TIER 3.0 requires database encryption

### Development Environment Note

**For Kind/local development (current setup):**
- Kubernetes secrets encryption is **sufficient** for development
- Database files encryption is **not critical** for local testing
- Focus on implementing encrypted PVs in production

### Action Items

**Immediate (for current Phase 2):**
1. ✅ Document Neo4j Community Edition limitation
2. ✅ Keep Kubernetes secrets encryption active
3. ✅ Update security documentation with risk assessment

**Next Phase (Production Readiness):**
1. [ ] Evaluate Neo4j Enterprise Edition vs. Cloud PV encryption
2. [ ] Budget approval for chosen solution ($5K/year or $500/year)
3. [ ] Implement encrypted PVs OR upgrade to Enterprise Edition
4. [ ] Re-assess compliance posture

---

**Document Version:** 1.0
**Date:** January 10, 2026
**Author:** Security Team
**Classification:** INTERNAL - Security Assessment
