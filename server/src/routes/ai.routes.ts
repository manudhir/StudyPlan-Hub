import express from 'express';
import { suggestPlan } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validation.middleware';
import { aiSuggestPlanSchema } from '../utils/validationSchemas';

const router = express.Router();

router.post('/suggest-plan', authenticate, validateBody(aiSuggestPlanSchema), suggestPlan);

export default router;
