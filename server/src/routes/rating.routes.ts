import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { ratePlan } from '../controllers/plan.controller';

const router = express.Router();

router.post('/:planId', authenticate, ratePlan);

export default router;
