import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { followPlan, unfollowPlan } from '../controllers/plan.controller';

const router = express.Router();

router.post('/:planId', authenticate, followPlan);
router.delete('/:planId', authenticate, unfollowPlan);

export default router;
