import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getPlanProgress, updateProgress } from '../controllers/plan.controller';

const router = express.Router();

router.get('/:planId', authenticate, getPlanProgress);
router.post('/:planId', authenticate, updateProgress);

export default router;
