import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import planRoutes from './routes/plan.routes';
import followRoutes from './routes/follow.routes';
import progressRoutes from './routes/progress.routes';
import ratingRoutes from './routes/rating.routes';
import healthRoutes from './routes/health.routes';
import aiRoutes from './routes/ai.routes';
import { rateLimiter } from './middleware/rateLimit.middleware';
import { requestLogger } from './middleware/request-logger.middleware';
import { errorHandler } from './middleware/error.middleware';
import logger from './utils/logger';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());

// CORS with strict configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without origin (mobile apps, server-to-server)
      if (!origin) {
        callback(null, true);
        return;
      }

      try {
        const url = new URL(origin);

        // Allow Netlify production domain
        if (url.hostname === 'studyplan-hub.netlify.app') {
          callback(null, true);
          return;
        }

        // Allow local development (localhost, 127.0.0.1, local IPs) only on port 3000
        if (
          url.port === '3000' &&
          (url.hostname === 'localhost' ||
            url.hostname === '127.0.0.1' ||
            url.hostname.startsWith('10.') ||
            url.hostname.startsWith('192.168.') ||
            url.hostname.startsWith('172.'))
        ) {
          callback(null, true);
          return;
        }

        // Allow custom CLIENT_URL from env
        if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) {
          callback(null, true);
          return;
        }

        callback(new Error('Not allowed by CORS'));
      } catch (e) {
        logger.warn(`Invalid CORS origin attempted: ${origin}`);
        callback(new Error('Invalid origin'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter);

// Routes
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/rating', ratingRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'Route not found',
    timestamp: new Date().toISOString(),
  });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
