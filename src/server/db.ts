import mongoose from 'mongoose';

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  return uri;
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
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
  return globalForMongoose.conn;
}

export async function getDb(): Promise<typeof mongoose> {
  return connect();
}

export { mongoose };
