import express from 'express';
import { register, login, refreshToken, logout } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validation.middleware';
import { registerSchema, loginSchema, refreshTokenSchema } from '../utils/validationSchemas';

const router = express.Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/refresh', validateBody(refreshTokenSchema), refreshToken);
router.post('/logout', validateBody(refreshTokenSchema), logout);

export default router;
