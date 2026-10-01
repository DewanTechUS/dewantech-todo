import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import type { Config } from './config.js';
import { errorHandler, notFound } from './middleware/error.js';
import { authRouter } from './routes/auth.js';
import { tasksRouter } from './routes/tasks.js';

export interface AppOptions {
  /** Max auth attempts per IP per 15 minutes. */
  authRateLimit?: number;
  /** Directory containing the built client (index.html). */
  clientDir?: string;
}

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp(config: Config, opts: AppOptions = {}): Express {
  const app = express();
  app.disable('x-powered-by');
  if (config.TRUST_PROXY) app.set('trust proxy', config.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          manifestSrc: ["'self'"],
          workerSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: (origin, cb) => cb(null, !origin || config.CORS_ORIGINS.includes(origin)),
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
  });
  app.use('/api/auth', authRouter(config, { authRateLimit: opts.authRateLimit ?? 20 }));
  app.use('/api/tasks', tasksRouter(config));
  app.use('/api', notFound);

  if (config.SERVE_CLIENT) {
    const clientDir = opts.clientDir ?? path.resolve(here, '../../client/dist');
    const indexHtml = path.join(clientDir, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      throw new Error(`SERVE_CLIENT=true but ${indexHtml} was not found. Run "npm run build" first.`);
    }
    // Hashed assets can be cached forever; the service worker and HTML must always revalidate.
    app.use(
      express.static(clientDir, {
        index: false,
        setHeaders: (res, filePath) => {
          if (/[\\/]assets[\\/]/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          else res.setHeader('Cache-Control', 'no-cache');
        },
      }),
    );
    // SPA fallback: unknown GETs render the app so client-side routes work on refresh.
    app.use((req, res, next) => {
      if (req.method !== 'GET' || !req.accepts('html')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtml);
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
