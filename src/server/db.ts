import mongoose from 'mongoose';

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  indexesSynced: boolean;
}

const globalForMongoose = globalThis as unknown as MongooseCache;

async function connect(): Promise<typeof mongoose> {
  if (globalForMongoose.conn) {
    return globalForMongoose.conn;
  }
  if (!globalForMongoose.promise) {
    globalForMongoose.promise = mongoose.connect(getMongoUri());
  }
  globalForMongoose.conn = await globalForMongoose.promise;

  // Drop stale indexes and recreate from schema definitions (runs once per process).
  // This fixes e.g. an old plain unique index on `number` being replaced by the
  // correct compound `{ userId, number }` unique index on Invoice.
  if (!globalForMongoose.indexesSynced) {
    globalForMongoose.indexesSynced = true;
    // Import models lazily to avoid circular deps at module load time
    const { Invoice } = await import('./models/invoice');
    await Invoice.syncIndexes().catch((e: unknown) =>
      console.warn('[db] Invoice.syncIndexes failed (non-fatal):', e)
    );
  }

  return globalForMongoose.conn;
}

export async function getDb(): Promise<typeof mongoose> {
  return connect();
}

export { mongoose };
