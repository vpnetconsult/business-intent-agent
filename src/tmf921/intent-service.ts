/**
 * TMF921 Intent Management Service
 *
 * Handles Intent resource management and integrates with existing IntentProcessor
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Intent,
  IntentCreate,
  IntentUpdate,
  IntentLifecycleStatus,
  IntentType,
  IntentReport,
  IntentReportEntry,
  IntentSpecification,
  IntentSpecificationCreate,
  IntentSpecificationUpdate
} from './types';
import { IntentProcessor } from '../intent-processor';
import { logger } from '../logger';

/**
 * In-memory storage for intents (replace with database in production)
 */
class IntentStore {
  private intents: Map<string, Intent> = new Map();

  save(intent: Intent): Intent {
    this.intents.set(intent.id!, intent);
    return intent;
  }

  findById(id: string): Intent | undefined {
    return this.intents.get(id);
  }

  findAll(filters?: {
    lifecycleStatus?: IntentLifecycleStatus | string;
    intentType?: IntentType;
    relatedPartyId?: string;
    name?: string;
    priority?: number | string;
    version?: string;
    creationDate?: string;
    lastUpdate?: string;
  }): Intent[] {
    let results = Array.from(this.intents.values());

    if (filters?.lifecycleStatus) {
      results = results.filter(i => i.lifecycleStatus === filters.lifecycleStatus);
    }

    if (filters?.intentType) {
      results = results.filter(i => i.intentType === filters.intentType);
    }

    if (filters?.relatedPartyId) {
      results = results.filter(i =>
        i.relatedParty?.some(p => p.id === filters.relatedPartyId)
      );
    }

    if (filters?.name) {
      results = results.filter(i => i.name === filters.name);
    }

    if (filters?.priority !== undefined) {
      results = results.filter(i => String(i.priority) === String(filters.priority));
    }

    if (filters?.version) {
      results = results.filter(i => i.version === filters.version);
    }

    if (filters?.creationDate) {
      results = results.filter(i => i.creationDate === filters.creationDate);
    }

    if (filters?.lastUpdate) {
      results = results.filter(i => i.lastUpdate === filters.lastUpdate);
    }

    return results;
  }

  delete(id: string): boolean {
    return this.intents.delete(id);
  }

  update(id: string, updates: Partial<Intent>): Intent | undefined {
    const intent = this.intents.get(id);
    if (!intent) return undefined;

    const now = new Date().toISOString();

    // Track status changes
    const statusChanged = updates.lifecycleStatus && updates.lifecycleStatus !== intent.lifecycleStatus;

    const updated = {
      ...intent,
      ...updates,
      lastUpdate: now,
      statusChangeDate: statusChanged ? now : intent.statusChangeDate,
    };

    this.intents.set(id, updated);
    return updated;
  }
}

/**
 * In-memory storage for intent specifications
 */
class IntentSpecificationStore {
  private specs: Map<string, IntentSpecification> = new Map();

  save(spec: IntentSpecification): IntentSpecification {
    this.specs.set(spec.id!, spec);
    return spec;
  }

  findById(id: string): IntentSpecification | undefined {
    return this.specs.get(id);
  }

  findAll(filters?: {
    name?: string;
    lifecycleStatus?: string;
    version?: string;
    lastUpdate?: string;
  }): IntentSpecification[] {
    let results = Array.from(this.specs.values());

    if (filters?.name) {
      results = results.filter(s => s.name === filters.name);
    }

    if (filters?.lifecycleStatus) {
      results = results.filter(s => s.lifecycleStatus === filters.lifecycleStatus);
    }

    if (filters?.version) {
      results = results.filter(s => s.version === filters.version);
    }

    if (filters?.lastUpdate) {
      results = results.filter(s => s.lastUpdate === filters.lastUpdate);
    }

    return results;
  }

  delete(id: string): boolean {
    return this.specs.delete(id);
  }

  update(id: string, updates: Partial<IntentSpecification>): IntentSpecification | undefined {
    const spec = this.specs.get(id);
    if (!spec) return undefined;

    const updated = {
      ...spec,
      ...updates,
      lastUpdate: new Date().toISOString(),
    };

    this.specs.set(id, updated);
    return updated;
  }
}

export class TMF921IntentService {
  private store: IntentStore;
  private specStore: IntentSpecificationStore;

  constructor(
    private intentProcessor: IntentProcessor
  ) {
    this.store = new IntentStore();
    this.specStore = new IntentSpecificationStore();
  }

  /**
   * Create a new Intent (POST /tmf-api/intentManagement/v5/intent)
   */
  async createIntent(intentCreate: IntentCreate, customerId: string): Promise<Intent> {
    const now = new Date().toISOString();
    const intentId = uuidv4();

    const intent: Intent = {
      // Core identifiers
      id: intentId,
      href: `/tmf-api/intentManagement/v5/intent/${intentId}`,
      name: intentCreate.name,
      description: intentCreate.description,

      // Classification
      intentType: intentCreate.intentType || IntentType.CUSTOMER_INTENT,
      priority: intentCreate.priority || 5,

      // Lifecycle (TMF921 spec compliant)
      lifecycleStatus: IntentLifecycleStatus.ACKNOWLEDGED,
      statusChangeDate: now,

      // Temporal
      creationDate: now,
      lastUpdate: now,
      validFor: intentCreate.validFor,

      // Versioning and context
      version: intentCreate.version || '1.0',
      context: intentCreate.context,
      isBundle: (intentCreate as any).isBundled ?? intentCreate.isBundle ?? false,

      // Expectations and specifications
      intentExpectation: intentCreate.intentExpectation || [],
      intentSpecification: intentCreate.intentSpecification,
      expression: intentCreate.expression,

      // Metadata
      characteristic: intentCreate.characteristic || [],
      attachment: intentCreate.attachment || [],

      // Relationships
      intentRelationship: intentCreate.intentRelationship || [],
      relatedParty: [
        // Always include authenticated customer for ownership
        {
          id: customerId,
          role: 'customer',
          '@referredType': 'Individual',
          '@type': 'RelatedParty'
        },
        // Include any additional parties from request (if provided)
        ...(intentCreate.relatedParty || [])
      ],

      // Reporting
      intentReport: [],

      // Polymorphism
      '@type': intentCreate['@type'] || 'Intent',
      '@baseType': intentCreate['@baseType'],
      '@schemaLocation': intentCreate['@schemaLocation']
    };

    // Save intent
    this.store.save(intent);

    logger.info({ intentId, customerId, intentType: intent.intentType }, 'TMF921 Intent created');

    // Process intent asynchronously
    this.processIntentAsync(intent, customerId).catch(error => {
      logger.error({ intentId, error: error.message }, 'Async intent processing failed');
    });

    return intent;
  }

  /**
   * Retrieve an Intent by ID (GET /tmf-api/intentManagement/v5/intent/{id})
   */
  async getIntent(id: string): Promise<Intent | undefined> {
    return this.store.findById(id);
  }

  /**
   * List Intents with optional filters (GET /tmf-api/intentManagement/v5/intent)
   */
  async listIntents(filters?: {
    lifecycleStatus?: IntentLifecycleStatus | string;
    intentType?: IntentType;
    relatedPartyId?: string;
    name?: string;
    priority?: number | string;
    version?: string;
    creationDate?: string;
    lastUpdate?: string;
    limit?: number;
    offset?: number;
  }): Promise<Intent[]> {
    let results = this.store.findAll({
      lifecycleStatus: filters?.lifecycleStatus,
      intentType: filters?.intentType,
      relatedPartyId: filters?.relatedPartyId,
      name: filters?.name,
      priority: filters?.priority,
      version: filters?.version,
      creationDate: filters?.creationDate,
      lastUpdate: filters?.lastUpdate,
    });

    // Pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  /**
   * Update an Intent (PATCH /tmf-api/intentManagement/v5/intent/{id})
   */
  async updateIntent(id: string, updates: IntentUpdate): Promise<Intent | undefined> {
    const updated = this.store.update(id, updates);

    if (updated) {
      logger.info({ intentId: id, updates }, 'TMF921 Intent updated');
    }

    return updated;
  }

  /**
   * Delete an Intent (DELETE /tmf-api/intentManagement/v5/intent/{id})
   */
  async deleteIntent(id: string): Promise<boolean> {
    const intent = this.store.findById(id);

    if (intent) {
      // Mark as cancelled before deletion (TMF921 spec compliant)
      this.store.update(id, { lifecycleStatus: IntentLifecycleStatus.CANCELLED });
      logger.info({ intentId: id }, 'TMF921 Intent cancelled');
    }

    const deleted = this.store.delete(id);

    if (deleted) {
      logger.info({ intentId: id }, 'TMF921 Intent deleted');
    }

    return deleted;
  }

  /**
   * Delete an IntentReport from an Intent
   */
  async deleteIntentReport(intentId: string, reportId: string): Promise<boolean> {
    const intent = this.store.findById(intentId);
    if (!intent || !intent.intentReport) return false;

    const initialLength = intent.intentReport.length;
    const filtered = intent.intentReport.filter(r => r.id !== reportId);

    if (filtered.length === initialLength) {
      return false; // Report not found
    }

    this.store.update(intentId, {
      intentReport: filtered
    });

    logger.info({ intentId, reportId }, 'TMF921 IntentReport deleted');
    return true;
  }

  /**
   * Add a report to an Intent
   */
  private async addIntentReport(intentId: string, reportState: string, reportValue?: string): Promise<void> {
    const intent = this.store.findById(intentId);
    if (!intent) return;

    const reportEntry: IntentReportEntry = {
      id: uuidv4(),
      reportingTimeStamp: new Date().toISOString(),
      reportState,
      reportValue,
      '@type': 'IntentReportEntry'
    };

    const report: IntentReport = {
      id: uuidv4(),
      href: `/tmf-api/intentManagement/v5/intent/${intentId}/intentReport/${reportEntry.id}`,
      creationDate: new Date().toISOString(),
      reportEntry: [reportEntry],
      '@type': 'IntentReport'
    };

    const currentReports = intent.intentReport || [];
    this.store.update(intentId, {
      intentReport: [...currentReports, report]
    });
  }

  /**
   * Process intent asynchronously using existing IntentProcessor
   */
  private async processIntentAsync(intent: Intent, customerId: string): Promise<void> {
    try {
      // Update lifecycleStatus to in progress (TMF921 spec compliant)
      this.store.update(intent.id!, { lifecycleStatus: IntentLifecycleStatus.IN_PROGRESS });
      await this.addIntentReport(intent.id!, 'processing', 'Intent processing started');

      // Extract intent text from intentExpectation
      const intentText = this.extractIntentText(intent);

      // Process using existing IntentProcessor
      const result = await this.intentProcessor.process(customerId, intentText, {
        tmf921Intent: intent
      });

      // Update lifecycleStatus to completed
      this.store.update(intent.id!, { lifecycleStatus: IntentLifecycleStatus.COMPLETED });
      await this.addIntentReport(intent.id!, 'completed', JSON.stringify({
        offer: result.recommended_offer?.name,
        products: result.recommended_offer?.selected_products,
        quote: result.quote
      }));

      logger.info({ intentId: intent.id, customerId }, 'TMF921 Intent processing completed');

    } catch (error) {
      // Update lifecycleStatus to failed
      this.store.update(intent.id!, { lifecycleStatus: IntentLifecycleStatus.FAILED });
      await this.addIntentReport(intent.id!, 'failed', (error as Error).message);

      logger.error({ intentId: intent.id, error: (error as Error).message }, 'TMF921 Intent processing failed');
    }
  }

  /**
   * Extract intent text from TMF921 Intent structure
   */
  private extractIntentText(intent: Intent): string {
    // Primary source: description
    if (intent.description) {
      return intent.description;
    }

    // Secondary source: intentExpectation
    if (intent.intentExpectation && intent.intentExpectation.length > 0) {
      const expectations = intent.intentExpectation
        .map(exp => exp.name || exp.expectationType)
        .filter(Boolean)
        .join('; ');

      if (expectations) {
        return expectations;
      }
    }

    // Fallback: name
    return intent.name;
  }

  /**
   * Create a new IntentSpecification (POST /tmf-api/intentManagement/v5/intentSpecification)
   */
  async createIntentSpecification(specCreate: IntentSpecificationCreate): Promise<IntentSpecification> {
    const now = new Date().toISOString();
    const specId = uuidv4();

    const spec: IntentSpecification = {
      id: specId,
      href: `/tmf-api/intentManagement/v5/intentSpecification/${specId}`,
      name: specCreate.name,
      description: specCreate.description,
      lifecycleStatus: specCreate.lifecycleStatus || 'ACTIVE',
      version: specCreate.version || '1.0',
      lastUpdate: now,
      validFor: specCreate.validFor,
      expressionSpecification: specCreate.expressionSpecification,
      characteristic: specCreate.characteristic || [],
      attachment: specCreate.attachment || [],
      relatedParty: specCreate.relatedParty || [],
      '@type': specCreate['@type'] || 'IntentSpecification',
      '@baseType': specCreate['@baseType'],
      '@schemaLocation': specCreate['@schemaLocation']
    };

    this.specStore.save(spec);
    logger.info({ specId, name: spec.name }, 'TMF921 IntentSpecification created');

    return spec;
  }

  /**
   * Retrieve an IntentSpecification by ID (GET /tmf-api/intentManagement/v5/intentSpecification/{id})
   */
  async getIntentSpecification(id: string): Promise<IntentSpecification | undefined> {
    return this.specStore.findById(id);
  }

  /**
   * List IntentSpecifications with optional filters (GET /tmf-api/intentManagement/v5/intentSpecification)
   */
  async listIntentSpecifications(filters?: {
    name?: string;
    lifecycleStatus?: string;
    version?: string;
    lastUpdate?: string;
  }): Promise<IntentSpecification[]> {
    return this.specStore.findAll(filters);
  }

  /**
   * Update an IntentSpecification (PATCH /tmf-api/intentManagement/v5/intentSpecification/{id})
   */
  async updateIntentSpecification(id: string, updates: IntentSpecificationUpdate): Promise<IntentSpecification | undefined> {
    const updated = this.specStore.update(id, updates);

    if (updated) {
      logger.info({ specId: id, updates }, 'TMF921 IntentSpecification updated');
    }

    return updated;
  }

  /**
   * Delete an IntentSpecification (DELETE /tmf-api/intentManagement/v5/intentSpecification/{id})
   */
  async deleteIntentSpecification(id: string): Promise<boolean> {
    const deleted = this.specStore.delete(id);

    if (deleted) {
      logger.info({ specId: id }, 'TMF921 IntentSpecification deleted');
    }

    return deleted;
  }
}
