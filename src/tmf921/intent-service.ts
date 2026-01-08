/**
 * TMF921 Intent Management Service
 *
 * Handles Intent resource management and integrates with existing IntentProcessor
 */

import { v4 as uuidv4 } from 'uuid';
import { Intent, IntentCreate, IntentUpdate, IntentLifecycleStatus, IntentType, IntentReport, IntentReportEntry } from './types';
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

export class TMF921IntentService {
  private store: IntentStore;

  constructor(
    private intentProcessor: IntentProcessor
  ) {
    this.store = new IntentStore();
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
      isBundle: intentCreate.isBundle || false,

      // Expectations and specifications
      intentExpectation: intentCreate.intentExpectation || [],
      intentSpecification: intentCreate.intentSpecification,
      expression: intentCreate.expression,

      // Metadata
      characteristic: intentCreate.characteristic || [],
      attachment: intentCreate.attachment || [],

      // Relationships
      intentRelationship: intentCreate.intentRelationship || [],
      relatedParty: intentCreate.relatedParty || [
        {
          id: customerId,
          role: 'customer',
          '@referredType': 'Individual'
        }
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
    limit?: number;
    offset?: number;
  }): Promise<Intent[]> {
    let results = this.store.findAll({
      lifecycleStatus: filters?.lifecycleStatus,
      intentType: filters?.intentType,
      relatedPartyId: filters?.relatedPartyId,
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
}
