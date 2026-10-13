/**
 * Runs the API against a local, disposable MongoDB (mongodb-memory-server) so you can
 * try the app without installing MongoDB or creating an Atlas cluster.
 * Data is kept in server/.data/ between runs; delete that folder to reset.
 *
 *   npm run dev:memory --workspace server
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';

const dbPath = path.resolve(import.meta.dirname, '../.data');
fs.mkdirSync(dbPath, { recursive: true });

const mongo = await MongoMemoryServer.create({ instance: { dbPath, storageEngine: 'wiredTiger', port: 27018 } });
process.env.MONGODB_URI = mongo.getUri('donext');
process.env.JWT_SECRET ??= 'dev-only-secret-change-me-0123456789abcdef';
console.log(`Local MongoDB running at ${process.env.MONGODB_URI} (data: ${dbPath})`);

const stop = async () => {
  await mongo.stop({ doCleanup: false });
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

await import('../src/index.js');
