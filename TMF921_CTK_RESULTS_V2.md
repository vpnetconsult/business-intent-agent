# TMF921 CTK Compliance Test Results - Version 2

**Test Date:** 2026-01-09
**Version:** v1.2.0-tmf921-compliance
**Total Tests:** 83
**Passing:** 36
**Failing:** 47
**Success Rate:** 43% (was 36%)

## Improvements from V1

**Previous Results:** 30 passing / 53 failing (36%)
**Current Results:** 36 passing / 47 failing (43%)
**Improvement:** +6 tests passing, -6 tests failing (+7% success rate)

## What Was Fixed

### ✅ Fully Implemented Features

1. **IntentSpecification Resource**
   - POST /intentSpecification - Create specification ✓
   - GET /intentSpecification - List specifications ✓
   - GET /intentSpecification?fields=name - Field projection ✓
   - GET /intentSpecification?name={name} - Filtering ✓

2. **Intent Resource (Collection Operations)**
   - POST /intent - Create intent ✓
   - GET /intent - List intents ✓
   - GET /intent?fields=expression - Field projection ✓
   - GET /intent?fields=name - Field projection ✓
   - GET /intent?name={name} - Filtering ✓

3. **Query Parameter Support**
   - Field projection (`?fields=field1,field2`) working on collections
   - Filtering by name working on collections

### ❌ Remaining Issues

#### 1. Intent GET by ID (404 errors)
**Failing Tests:** 14 tests
```
GET /intent/{id}
GET /intent/{id}?fields=expression
GET /intent/{id}?fields=name
PATCH /intent/{id}
DELETE /intent/{id}
```

**Root Cause:** CTK is using placeholder `{id}` values that don't exist in the in-memory store. The tests expect to retrieve an Intent created in a previous test, but the store doesn't persist between test runs.

**Possible Solutions:**
- Pre-populate test data before CTK runs
- Use CTK's test data setup feature
- Switch from in-memory to persistent storage (Redis/database)

#### 2. IntentSpecification GET by ID (404 errors)
**Failing Tests:** 6 tests
```
GET /intentSpecification/{id}
GET /intentSpecification/{id}?fields=name
PATCH /intentSpecification/{id}
DELETE /intentSpecification/{id}
```

**Root Cause:** Same as Intent - placeholder IDs don't exist

#### 3. IntentReport Sub-Resource (404 errors)
**Failing Tests:** 21 tests
```
GET /intent/{intentId}/intentReport
GET /intent/{intentId}/intentReport/{id}
DELETE /intent/{intentId}/intentReport/{id}
+ all filtering and field projection variants
```

**Root Cause:** The routes exist but return 404 because:
- The parent Intent {intentId} doesn't exist (placeholder ID)
- Even if it did, the Intent has no intentReports yet

#### 4. IntentSpecification POST validation (400 error)
**Failing Tests:** 2 tests

**Issue:** POST returns 400 instead of 201 due to missing required fields in CTK payload

**CTK Sends:**
```json
{
  "@baseType": "EntitySpecification",
  "@schemaLocation": "...",
  "@type": "IntentSpecification",
  "description": "...",
  "expressionSpecification": { ... },
  "id": "EventLiveBroadcast_Spec",  // Should not be in POST
  "lastUpdate": "...",               // Should not be in POST
  "lifecycleStatus": "ACTIVE",
  "name": "EventLiveBroadcastSpec",
  "relatedParty": [...],
  "validFor": {...},
  "version": "1.0"
}
```

**Problem:** CTK is sending read-only fields (id, lastUpdate) that our mass assignment protection rejects

**Solution:** Add these fields to the allowlist (they'll be ignored anyway)

## Summary by Resource

### Intent Resource
- ✅ POST (create) - Working
- ✅ GET collection - Working
- ✅ GET collection with filters - Working
- ✅ GET collection with field projection - Working
- ❌ GET by ID - 404 (no test data)
- ❌ PATCH by ID - 404 (no test data)
- ❌ DELETE by ID - 404 (no test data)

### IntentSpecification Resource
- ❌ POST (create) - 400 (validation issue)
- ✅ GET collection - Working
- ✅ GET collection with filters - Working
- ✅ GET collection with field projection - Working
- ❌ GET by ID - 404 (no test data)
- ❌ PATCH by ID - 404 (no test data)
- ❌ DELETE by ID - 404 (no test data)

### IntentReport Sub-Resource
- ❌ All endpoints - 404 (no parent Intent exists)

## Next Steps to Improve Compliance

### High Priority (Quick Wins)

1. **Fix IntentSpecification POST validation** (+2 tests)
   - Add `id`, `lastUpdate` to allowlist for spec creation
   - These are read-only and will be overwritten anyway

2. **Add test data pre-population** (+20-30 tests)
   - Create sample Intent with ID that CTK expects
   - Create sample IntentSpecification
   - Add IntentReports to sample Intents

### Medium Priority

3. **Switch to persistent storage** (Enables proper testing)
   - Replace in-memory Map with Redis or SQLite
   - Allows data to persist across deployments
   - Makes CTK testing more realistic

### Lower Priority

4. **Implement missing optional resources**
   - ProbeIntent, JudgeIntent, BestIntent (if required by spec)

## Files Modified in This Release

- `/src/tmf921/routes.ts` - Added IntentSpecification routes, IntentReport routes, field projection
- `/src/tmf921/intent-service.ts` - Added IntentSpecification CRUD, IntentReport delete, name filtering
- `/src/tmf921/types.ts` - Added IntentSpecification types
- `/src/response-filter.ts` - Added isBundled field, IntentSpec allowlists

## Deployment Info

- **Image:** business-intent-agent:v1.2.0-tmf921-compliance
- **Deployed to:** kind-local-k8s/intent-platform namespace
- **Port:** 8080 (port-forwarded)

## CTK Report Location

- HTML Report: `~/Downloads/TMF921/DO_NOT_CHANGE/cypress/reports/index.html`
- Log File: `~/Downloads/TMF921/ctk-output-v2-*.log`
