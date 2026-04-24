import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import planRoutes from './routes/plan.routes';
import followRoutes from './routes/follow.routes';
import progressRoutes from './routes/progress.routes';
import ratingRoutes from './routes/rating.routes';
import { rateLimiter } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();

// Allow development and production frontends
app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests without origin (like mobile apps or server-to-server)
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
      
      // Allow local development (localhost, 127.0.0.1, any local IP) on port 3000
      if (url.port === '3000' && (
        url.hostname === 'localhost' || 
        url.hostname === '127.0.0.1' || 
        url.hostname.startsWith('10.') || 
        url.hostname.startsWith('192.168.') || 
        url.hostname.startsWith('172.')
      )) {
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
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(rateLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/rating', ratingRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

export default app;
