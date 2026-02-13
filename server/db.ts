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

// Handle Neon WebSocket connection errors gracefully
// Handle Neon WebSocket connection errors gracefully
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  process.on('uncaughtException', (error: any) => {
    // Handle known Neon WebSocket issues
    if (error.message && (
      error.message.includes('Cannot set property message') ||
      error.message.includes('terminating connection due to administrator command') ||
      error.message.includes('FATAL') ||
      error.code === '57P01' // Neon connection termination code
    )) {
      return; // Don't crash the process for database connection issues
    }

    // For non-database errors, log and exit gracefully
    console.error('Uncaught exception:', error);
    // process.exit(1);
  });
}

// Handle unhandled promise rejections from database operations
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  // For database-related rejections, don't crash the process
  if (reason && typeof reason === 'object' && 'code' in reason && reason.code === '57P01') {
    return;
  }
});


export const db = drizzle({ client: pool, schema });

// Test database connection
export async function testDatabaseConnection() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
