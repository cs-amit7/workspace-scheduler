import { Router } from 'express';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';
import validate from '../middleware/validate.js';
import {
  listResourcesSchema,
  getResourceSchema,
  getAvailabilitySchema,
  createResourceSchema,
  updateResourceSchema,
  deleteResourceSchema,
} from '../validators/resources.js';
import {
  listResources,
  getResource,
  getResourceAvailability,
  createResource,
  updateResource,
  deleteResource,
} from '../controllers/resourceController.js';

const router = Router();

// All resource routes require authentication
router.use(auth);

// ── Read endpoints (any authenticated user) ───────────────────────────────────
router.get('/', validate(listResourcesSchema), listResources);
router.get('/:id/availability', validate(getAvailabilitySchema), getResourceAvailability);
router.get('/:id', validate(getResourceSchema), getResource);

// ── Write endpoints (admin only) ──────────────────────────────────────────────
router.post('/', requireRole('admin'), validate(createResourceSchema), createResource);
router.patch('/:id', requireRole('admin'), validate(updateResourceSchema), updateResource);
router.delete('/:id', requireRole('admin'), validate(deleteResourceSchema), deleteResource);

export default router;
