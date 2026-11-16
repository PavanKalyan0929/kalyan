import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from './config.ts';
import { authRouter } from './routes/authRoutes.ts';
import { collegeAdminRouter } from './routes/collegeAdminRoutes.ts';
import { fileRouter } from './routes/fileRoutes.ts';
import { publicRouter } from './routes/publicRoutes.ts';
import { stateAdminRouter } from './routes/stateAdminRoutes.ts';
import { studentRouter } from './routes/studentRoutes.ts';

export function createApiApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: false, // Allows preview inside AI Studio iframe while retaining security headers
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Basic origin check for state-changing requests in production
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.isProd && !config.allowedOrigins.includes(origin) && origin !== config.appUrl) {
      return res.status(403).json({ error: 'Origin not permitted by CORS policy.' });
    }
    return next();
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 600,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api', apiLimiter);

  app.use('/api', authRouter);
  app.use('/api', publicRouter);
  app.use('/api', studentRouter);
  app.use('/api', collegeAdminRouter);
  app.use('/api', stateAdminRouter);
  app.use('/api/files', fileRouter);

  // Global API error handler (multer file errors, JSON parse errors, etc.)
  app.use('/api', (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.message.includes('File too large') || err.message.includes('Only JPEG') ? 400 : 500;
    res.status(status).json({
      error: status === 400 ? err.message : 'An unexpected server error occurred.',
    });
  });

  return app;
}
