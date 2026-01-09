/**
 * TMF921 Intent Management API Routes
 *
 * Implements RESTful endpoints following TMF921 specification
 */

import { Router, Request, Response } from 'express';
import { TMF921IntentService } from './intent-service';
import {
  IntentCreate,
  IntentUpdate,
  IntentLifecycleStatus,
  IntentType,
  IntentSpecificationCreate,
  IntentSpecificationUpdate
} from './types';
import { logger } from '../logger';
import { authenticateApiKey, validateCustomerOwnership } from '../auth';
import { filterInput } from '../response-filter';

/**
 * Apply field projection to response data
 * Supports TMF921 ?fields=field1,field2,field3 query parameter
 */
function applyFieldProjection(data: any, fields?: string): any {
  if (!fields || !data) return data;

  const requestedFields = fields.split(',').map(f => f.trim());

  if (Array.isArray(data)) {
    return data.map(item => projectFields(item, requestedFields));
  }

  return projectFields(data, requestedFields);
}

function projectFields(obj: any, fields: string[]): any {
  if (!obj || typeof obj !== 'object') return obj;

  const projected: any = {};
  for (const field of fields) {
    if (field in obj) {
      projected[field] = obj[field];
    }
  }

  // Always include id and href for TMF921 compliance
  if (obj.id) projected.id = obj.id;
  if (obj.href) projected.href = obj.href;
  if (obj['@type']) projected['@type'] = obj['@type'];

  return projected;
}

export function createTMF921Router(intentService: TMF921IntentService): Router {
  const router = Router();

  /**
   * POST /tmf-api/intentManagement/v5/intent
   * Create a new Intent
   */
  router.post(
    '/intent',
    authenticateApiKey,
    validateCustomerOwnership,
    async (req: Request, res: Response) => {
      try {
        // Mass assignment protection
        const { filtered, violations } = filterInput(req.body, 'tmf921_intent_create');

        if (violations.length > 0) {
          logger.warn({ violations }, 'TMF921: Mass assignment protection triggered');
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Request contains unexpected fields',
            violations,
          });
        }

        const intentCreate: IntentCreate = filtered as IntentCreate;

        // Validate required fields
        if (!intentCreate.name) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'name is required',
          });
        }

        // Get customer ID from auth context
        const customerId = (req as any).auth?.customerId;
        if (!customerId) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Customer ID not found in authentication context',
          });
        }

        const intent = await intentService.createIntent(intentCreate, customerId);

        logger.info({ intentId: intent.id, customerId }, 'TMF921 Intent created via API');

        // TMF921 spec: 201 Created for sync, 202 Accepted for async
        // We process async, but return 201 with intent in acknowledged state
        res.status(201)
          .location(intent.href!)
          .json(intent);

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 Intent creation failed');

        // TMF921 spec-compliant error responses
        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * GET /tmf-api/intentManagement/v5/intent/{id}
   * Retrieve a specific Intent
   */
  router.get(
    '/intent/:id',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const intent = await intentService.getIntent(id);

        if (!intent) {
          return res.status(404).json({
            error: 'Not Found',
            message: `Intent with id ${id} not found`,
          });
        }

        // Verify customer ownership
        const customerId = (req as any).auth?.customerId;
        const hasAccess = intent.relatedParty?.some(
          party => party.id === customerId && party.role === 'customer'
        );

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied to this intent',
          });
        }

        // Apply field projection if requested
        const fields = req.query.fields as string | undefined;
        const response = applyFieldProjection(intent, fields);

        res.json(response);

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 Intent retrieval failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * GET /tmf-api/intentManagement/v5/intent
   * List Intents with optional filters
   */
  router.get(
    '/intent',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const customerId = (req as any).auth?.customerId;

        // Parse query parameters (TMF921 spec compliant)
        const filters = {
          lifecycleStatus: req.query.lifecycleStatus as IntentLifecycleStatus | string | undefined,
          intentType: req.query.intentType as IntentType | undefined,
          name: req.query.name as string | undefined,
          priority: req.query.priority as string | undefined,
          version: req.query.version as string | undefined,
          creationDate: req.query.creationDate as string | undefined,
          lastUpdate: req.query.lastUpdate as string | undefined,
          relatedPartyId: customerId, // Always filter by customer
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        };

        const intents = await intentService.listIntents(filters);

        // Apply field projection if requested
        const fields = req.query.fields as string | undefined;
        const response = applyFieldProjection(intents, fields);

        res.json(response);

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 Intent listing failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * PATCH /tmf-api/intentManagement/v5/intent/{id}
   * Update an Intent
   */
  router.patch(
    '/intent/:id',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Check intent exists and verify ownership
        const existingIntent = await intentService.getIntent(id);
        if (!existingIntent) {
          return res.status(404).json({
            error: 'Not Found',
            message: `Intent with id ${id} not found`,
          });
        }

        const customerId = (req as any).auth?.customerId;
        const hasAccess = existingIntent.relatedParty?.some(
          party => party.id === customerId && party.role === 'customer'
        );

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied to this intent',
          });
        }

        // Mass assignment protection
        const { filtered, violations } = filterInput(req.body, 'tmf921_intent_update');

        if (violations.length > 0) {
          logger.warn({ violations }, 'TMF921: Mass assignment protection triggered');
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Request contains unexpected fields',
            violations,
          });
        }

        const updates: IntentUpdate = filtered as IntentUpdate;
        const updatedIntent = await intentService.updateIntent(id, updates);

        if (!updatedIntent) {
          return res.status(404).json({
            error: 'Not Found',
            message: `Intent with id ${id} not found`,
          });
        }

        res.json(updatedIntent);

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 Intent update failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * DELETE /tmf-api/intentManagement/v5/intent/{id}
   * Delete an Intent
   */
  router.delete(
    '/intent/:id',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Check intent exists and verify ownership
        const existingIntent = await intentService.getIntent(id);
        if (!existingIntent) {
          return res.status(404).json({
            error: 'Not Found',
            message: `Intent with id ${id} not found`,
          });
        }

        const customerId = (req as any).auth?.customerId;
        const hasAccess = existingIntent.relatedParty?.some(
          party => party.id === customerId && party.role === 'customer'
        );

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied to this intent',
          });
        }

        const deleted = await intentService.deleteIntent(id);

        if (!deleted) {
          return res.status(404).json({
            error: 'Not Found',
            message: `Intent with id ${id} not found`,
          });
        }

        // TMF921 spec: 202 Accepted or 204 No Content
        // We use 204 for immediate deletion
        res.status(204).send();

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 Intent deletion failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * GET /tmf-api/intentManagement/v5/intent/{intentId}/intentReport
   * List IntentReports for a specific Intent
   */
  router.get(
    '/intent/:intentId/intentReport',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const { intentId } = req.params;

        const intent = await intentService.getIntent(intentId);
        if (!intent) {
          return res.status(404).json({
            error: 'Not Found',
            message: `Intent with id ${intentId} not found`,
          });
        }

        // Verify customer ownership
        const customerId = (req as any).auth?.customerId;
        const hasAccess = intent.relatedParty?.some(
          party => party.id === customerId && party.role === 'customer'
        );

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied to this intent',
          });
        }

        const reports = intent.intentReport || [];

        // Apply filters
        const name = req.query.name as string | undefined;
        const creationDate = req.query.creationDate as string | undefined;
        let filtered = reports;

        if (name) {
          filtered = filtered.filter(r => (r as any).name === name);
        }

        if (creationDate) {
          filtered = filtered.filter(r => r.creationDate === creationDate);
        }

        // Apply field projection if requested
        const fields = req.query.fields as string | undefined;
        const response = applyFieldProjection(filtered, fields);

        res.json(response);

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 IntentReport listing failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * GET /tmf-api/intentManagement/v5/intent/{intentId}/intentReport/{id}
   * Retrieve a specific IntentReport
   */
  router.get(
    '/intent/:intentId/intentReport/:id',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const { intentId, id } = req.params;

        const intent = await intentService.getIntent(intentId);
        if (!intent) {
          return res.status(404).json({
            error: 'Not Found',
            message: `Intent with id ${intentId} not found`,
          });
        }

        // Verify customer ownership
        const customerId = (req as any).auth?.customerId;
        const hasAccess = intent.relatedParty?.some(
          party => party.id === customerId && party.role === 'customer'
        );

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied to this intent',
          });
        }

        const report = intent.intentReport?.find(r => r.id === id);
        if (!report) {
          return res.status(404).json({
            error: 'Not Found',
            message: `IntentReport with id ${id} not found`,
          });
        }

        // Apply field projection if requested
        const fields = req.query.fields as string | undefined;
        const response = applyFieldProjection(report, fields);

        res.json(response);

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 IntentReport retrieval failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * DELETE /tmf-api/intentManagement/v5/intent/{intentId}/intentReport/{id}
   * Delete a specific IntentReport
   */
  router.delete(
    '/intent/:intentId/intentReport/:id',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const { intentId, id } = req.params;

        const intent = await intentService.getIntent(intentId);
        if (!intent) {
          return res.status(404).json({
            error: 'Not Found',
            message: `Intent with id ${intentId} not found`,
          });
        }

        // Verify customer ownership
        const customerId = (req as any).auth?.customerId;
        const hasAccess = intent.relatedParty?.some(
          party => party.id === customerId && party.role === 'customer'
        );

        if (!hasAccess) {
          return res.status(403).json({
            error: 'Forbidden',
            message: 'Access denied to this intent',
          });
        }

        const deleted = await intentService.deleteIntentReport(intentId, id);
        if (!deleted) {
          return res.status(404).json({
            error: 'Not Found',
            message: `IntentReport with id ${id} not found`,
          });
        }

        res.status(204).send();

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 IntentReport deletion failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * POST /tmf-api/intentManagement/v5/intentSpecification
   * Create a new IntentSpecification
   */
  router.post(
    '/intentSpecification',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const { filtered, violations } = filterInput(req.body, 'tmf921_intent_spec_create');

        if (violations.length > 0) {
          logger.warn({ violations }, 'TMF921: Mass assignment protection triggered');
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Request contains unexpected fields',
            violations,
          });
        }

        const specCreate: IntentSpecificationCreate = filtered as IntentSpecificationCreate;

        if (!specCreate.name) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'name is required',
          });
        }

        const spec = await intentService.createIntentSpecification(specCreate);

        logger.info({ specId: spec.id }, 'TMF921 IntentSpecification created via API');

        res.status(201)
          .location(spec.href!)
          .json(spec);

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 IntentSpecification creation failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * GET /tmf-api/intentManagement/v5/intentSpecification
   * List IntentSpecifications with optional filters
   */
  router.get(
    '/intentSpecification',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const filters = {
          name: req.query.name as string | undefined,
          lifecycleStatus: req.query.lifecycleStatus as string | undefined,
          version: req.query.version as string | undefined,
          lastUpdate: req.query.lastUpdate as string | undefined,
        };

        const specs = await intentService.listIntentSpecifications(filters);

        // Apply field projection if requested
        const fields = req.query.fields as string | undefined;
        const response = applyFieldProjection(specs, fields);

        res.json(response);

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 IntentSpecification listing failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * GET /tmf-api/intentManagement/v5/intentSpecification/{id}
   * Retrieve a specific IntentSpecification
   */
  router.get(
    '/intentSpecification/:id',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const spec = await intentService.getIntentSpecification(id);

        if (!spec) {
          return res.status(404).json({
            error: 'Not Found',
            message: `IntentSpecification with id ${id} not found`,
          });
        }

        // Apply field projection if requested
        const fields = req.query.fields as string | undefined;
        const response = applyFieldProjection(spec, fields);

        res.json(response);

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 IntentSpecification retrieval failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * PATCH /tmf-api/intentManagement/v5/intentSpecification/{id}
   * Update an IntentSpecification
   */
  router.patch(
    '/intentSpecification/:id',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const existingSpec = await intentService.getIntentSpecification(id);
        if (!existingSpec) {
          return res.status(404).json({
            error: 'Not Found',
            message: `IntentSpecification with id ${id} not found`,
          });
        }

        const { filtered, violations } = filterInput(req.body, 'tmf921_intent_spec_update');

        if (violations.length > 0) {
          logger.warn({ violations }, 'TMF921: Mass assignment protection triggered');
          return res.status(400).json({
            error: 'Invalid request',
            message: 'Request contains unexpected fields',
            violations,
          });
        }

        const updates: IntentSpecificationUpdate = filtered as IntentSpecificationUpdate;
        const updatedSpec = await intentService.updateIntentSpecification(id, updates);

        if (!updatedSpec) {
          return res.status(404).json({
            error: 'Not Found',
            message: `IntentSpecification with id ${id} not found`,
          });
        }

        res.json(updatedSpec);

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 IntentSpecification update failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  /**
   * DELETE /tmf-api/intentManagement/v5/intentSpecification/{id}
   * Delete an IntentSpecification
   */
  router.delete(
    '/intentSpecification/:id',
    authenticateApiKey,
    async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        const existingSpec = await intentService.getIntentSpecification(id);
        if (!existingSpec) {
          return res.status(404).json({
            error: 'Not Found',
            message: `IntentSpecification with id ${id} not found`,
          });
        }

        const deleted = await intentService.deleteIntentSpecification(id);

        if (!deleted) {
          return res.status(404).json({
            error: 'Not Found',
            message: `IntentSpecification with id ${id} not found`,
          });
        }

        res.status(204).send();

      } catch (error) {
        logger.error({ error: (error as Error).message }, 'TMF921 IntentSpecification deletion failed');

        const err = error as any;
        const statusCode = err.status || err.statusCode || 500;

        res.status(statusCode).json({
          error: err.name || 'Internal server error',
          message: err.message,
          code: statusCode,
        });
      }
    }
  );

  return router;
}
