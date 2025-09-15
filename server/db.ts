import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with connection pooling settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle Neon WebSocket connection errors to prevent uncaught exceptions
process.on('uncaughtException', (error) => {
  if (error.message && error.message.includes('Cannot set property message')) {
    console.warn('Neon WebSocket connection error handled:', error.message);
    return; // Don't crash the process for this known issue
  }
  // Re-throw other uncaught exceptions
  throw error;
});


export const db = drizzle({ client: pool, schema });

// Test database connection
export async function testDatabaseConnection() {
  try {
    const result = await pool.query('SELECT 1');
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}