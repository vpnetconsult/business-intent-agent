/**
 * TMF921 Intent Management API - TypeScript Types
 * Version: 5.0.0
 *
 * Based on TM Forum TMF921 Intent Management API specification
 * https://www.tmforum.org/resources/specifications/tmf921-intent-management-api-user-guide-v5-0-0/
 */

/**
 * Intent Lifecycle States (TMF921 uses lifecycleStatus)
 */
export enum IntentLifecycleStatus {
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

/**
 * Time Period
 */
export interface TimePeriod {
  startDateTime?: string;
  endDateTime?: string;
}

/**
 * Characteristic (generic key-value metadata)
 */
export interface Characteristic {
  name: string;
  value: any;
  valueType?: string;
  '@type'?: string;
}

/**
 * Intent Expression (for semantic intent definitions)
 */
export interface IntentExpression {
  iri?: string;  // Internationalized Resource Identifier
  '@type'?: string;
}

/**
 * Entity Relationship (for linking related intents)
 */
export interface EntityRelationship {
  id?: string;
  href?: string;
  relationshipType?: string;
  '@type'?: string;
}

/**
 * Intent Type Classification
 */
export enum IntentType {
  SERVICE_INTENT = 'ServiceIntent',
  DELIVERY_INTENT = 'DeliveryIntent',
  ASSURANCE_INTENT = 'AssuranceIntent',
  CUSTOMER_INTENT = 'CustomerIntent'
}

/**
 * Base schema for referencing related entities
 */
export interface RelatedEntity {
  id: string;
  href?: string;
  name?: string;
  role?: string;
  '@referredType'?: string;
}

/**
 * Intent Expectation Target
 */
export interface IntentExpectationTarget {
  id?: string;
  name?: string;
  targetValue?: string;
  targetValueType?: string;
  '@type'?: string;
}

/**
 * Intent Expectation (what is expected to be achieved)
 */
export interface IntentExpectation {
  id?: string;
  name?: string;
  expectationType?: string;
  expectationTarget?: IntentExpectationTarget[];
  '@type'?: string;
}

/**
 * Intent Report Entry (compliance and progress reporting)
 */
export interface IntentReportEntry {
  id?: string;
  reportingTimeStamp?: string;
  reportState?: string;
  reportValue?: string;
  '@type'?: string;
}

/**
 * Intent Report
 */
export interface IntentReport {
  id?: string;
  href?: string;
  creationDate?: string;
  reportEntry?: IntentReportEntry[];
  '@type'?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
}

/**
 * Main Intent Resource (TMF921) - Full Spec Compliant
 */
export interface Intent {
  // Core identifiers
  id?: string;
  href?: string;
  name: string;
  description?: string;

  // Classification and priority
  intentType?: IntentType;
  priority?: number | string;  // Spec allows string for named priorities

  // Lifecycle (TMF921 uses lifecycleStatus instead of state)
  lifecycleStatus?: IntentLifecycleStatus | string;
  statusChangeDate?: string;  // When status last changed

  // Temporal
  creationDate?: string;
  lastUpdate?: string;  // TMF921 uses lastUpdate, not lastModifiedDate
  validFor?: TimePeriod;  // Validity period for the intent

  // Versioning and context
  version?: string;
  context?: string;
  isBundle?: boolean;  // Whether this is a bundle of intents

  // Expectations and specifications
  intentExpectation?: IntentExpectation[];
  intentSpecification?: RelatedEntity;
  expression?: IntentExpression;  // Semantic intent expression (JSON-LD, Turtle)

  // Metadata and attachments
  characteristic?: Characteristic[];  // Generic key-value metadata
  attachment?: RelatedEntity[];  // Documents, media, etc.

  // Relationships
  intentRelationship?: EntityRelationship[];  // Related intents
  relatedParty?: RelatedEntity[];

  // Reporting
  intentReport?: IntentReport[];

  // Polymorphism
  '@type'?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
}

/**
 * Request body for creating an Intent (POST /intent)
 */
export interface IntentCreate {
  name: string;
  description?: string;
  intentType?: IntentType;
  priority?: number | string;
  validFor?: TimePeriod;
  context?: string;
  version?: string;
  isBundle?: boolean;
  intentExpectation?: IntentExpectation[];
  intentSpecification?: RelatedEntity;
  expression?: IntentExpression;
  characteristic?: Characteristic[];
  attachment?: RelatedEntity[];
  intentRelationship?: EntityRelationship[];
  relatedParty?: RelatedEntity[];
  '@type'?: string;
  '@baseType'?: string;
  '@schemaLocation'?: string;
}

/**
 * Request body for updating an Intent (PATCH /intent/{id})
 */
export interface IntentUpdate {
  name?: string;
  description?: string;
  priority?: number | string;
  lifecycleStatus?: IntentLifecycleStatus | string;
  validFor?: TimePeriod;
  context?: string;
  version?: string;
  intentExpectation?: IntentExpectation[];
  characteristic?: Characteristic[];
  expression?: IntentExpression;
  '@type'?: string;
}

/**
 * Event types for Intent notifications
 */
export enum IntentEventType {
  INTENT_CREATE_EVENT = 'IntentCreateEvent',
  INTENT_STATE_CHANGE_EVENT = 'IntentStateChangeEvent',
  INTENT_ATTRIBUTE_VALUE_CHANGE_EVENT = 'IntentAttributeValueChangeEvent',
  INTENT_DELETE_EVENT = 'IntentDeleteEvent',
  INTENT_REPORT_STATE_CHANGE_EVENT = 'IntentReportStateChangeEvent'
}

/**
 * Event payload structure
 */
export interface IntentEvent {
  eventId: string;
  eventTime: string;
  eventType: IntentEventType;
  event: {
    intent: Intent;
  };
}

/**
 * Response wrapper for collection endpoints
 */
export interface IntentCollection {
  intent: Intent[];
  '@type'?: string;
}
