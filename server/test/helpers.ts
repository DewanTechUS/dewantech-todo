import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import type { Express } from 'express';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import type { Mail } from '../src/lib/mailer.js';

/** Emails the app 'sent' during tests, newest last. */
export const sentMail: Mail[] = [];

export const testConfig = loadConfig({
  NODE_ENV: 'test',
  MONGODB_URI: 'unused-in-tests',
  JWT_SECRET: 'test-secret-that-is-definitely-long-enough-123',
  CORS_ORIGINS: 'http://localhost:5173',
  APP_URL: 'https://donext.example.com',
});

/** Spins up an in-memory MongoDB for the test file and returns a lazily-created app. */
export function useTestApp(): { app: () => Express } {
  let mongo: MongoMemoryServer;
  let app: Express;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await mongoose.connection.syncIndexes();
    app = createApp(testConfig, { authRateLimit: 1000, mailer: { send: async (m) => void sentMail.push(m) } });
  });

  afterEach(async () => {
    sentMail.length = 0;
    const { collections } = mongoose.connection;
    await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongo?.stop();
  });

  return { app: () => app };
}

let counter = 0;
export async function signup(app: Express, overrides: Partial<{ name: string; email: string; password: string }> = {}) {
  counter += 1;
  const body = { name: 'Test User', email: `user${counter}@example.com`, password: 'secret123', ...overrides };
  const res = await request(app).post('/api/auth/signup').send(body);
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token as string, user: res.body.user, password: body.password, email: body.email };
}
