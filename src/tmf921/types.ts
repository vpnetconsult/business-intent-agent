/**
 * TMF921 Intent Management API - TypeScript Types
 * Version: 5.0.0
 *
 * Based on TM Forum TMF921 Intent Management API specification
 * https://www.tmforum.org/resources/specifications/tmf921-intent-management-api-user-guide-v5-0-0/
 */

/**
 * Intent Lifecycle States
 */
export enum IntentStateType {
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  PENDING = 'pending'
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
 * Main Intent Resource (TMF921)
 */
export interface Intent {
  id?: string;
  href?: string;
  name: string;
  description?: string;
  intentType?: IntentType;
  priority?: number;
  state?: IntentStateType;
  creationDate?: string;
  lastModifiedDate?: string;
  intentExpectation?: IntentExpectation[];
  intentReport?: IntentReport[];
  relatedParty?: RelatedEntity[];
  intentSpecification?: RelatedEntity;
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
  priority?: number;
  intentExpectation?: IntentExpectation[];
  relatedParty?: RelatedEntity[];
  intentSpecification?: RelatedEntity;
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
  priority?: number;
  state?: IntentStateType;
  intentExpectation?: IntentExpectation[];
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
