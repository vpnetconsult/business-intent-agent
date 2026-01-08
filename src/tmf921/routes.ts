/**
 * TMF921 Intent Management API Routes
 *
 * Implements RESTful endpoints following TMF921 specification
 */

import { Router, Request, Response } from 'express';
import { TMF921IntentService } from './intent-service';
import { IntentCreate, IntentUpdate, IntentLifecycleStatus, IntentType } from './types';
import { logger } from '../logger';
import { authenticateApiKey, validateCustomerOwnership } from '../auth';
import { filterInput } from '../response-filter';

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

        res.json(intent);

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
          relatedPartyId: customerId, // Always filter by customer
          limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
          offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        };

        const intents = await intentService.listIntents(filters);

        res.json(intents);

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

  return router;
}
