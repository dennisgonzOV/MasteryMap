import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_POOL_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

if (process.env.NODE_ENV === "production" && !databaseUrl.includes("-pooler.")) {
  console.warn(
    "[db] DATABASE_POOL_URL is not configured. For Neon production traffic, prefer the -pooler connection string.",
  );
}

function parsePositiveIntEnv(name: string, fallbackValue: number): number {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallbackValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

const TRANSIENT_DATABASE_CODES = new Set([
  "57P01", // admin shutdown
  "57P02", // crash shutdown
  "57P03", // cannot connect now
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "08P01",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
]);

const TRANSIENT_DATABASE_MESSAGE_PATTERNS = [
  /terminating connection due to administrator command/i,
  /connection terminated unexpectedly/i,
  /fetch failed/i,
  /websocket/i,
  /socket hang up/i,
  /connection .*closed/i,
  /timeout/i,
  /failed to connect/i,
  /database .*waking/i,
];

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const maybeCode = (error as { code?: unknown }).code;
  if (typeof maybeCode === "string" && maybeCode.length > 0) {
    return maybeCode;
  }

  const maybeCauseCode = (error as { cause?: { code?: unknown } }).cause?.code;
  if (typeof maybeCauseCode === "string" && maybeCauseCode.length > 0) {
    return maybeCauseCode;
  }

  return undefined;
}

export function isTransientDatabaseError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (code && TRANSIENT_DATABASE_CODES.has(code)) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error ?? "");
  return TRANSIENT_DATABASE_MESSAGE_PATTERNS.some((pattern) => pattern.test(message));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DatabaseRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  context?: string;
}

export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: DatabaseRetryOptions = {},
): Promise<T> {
  const {
    maxRetries = 2,
    baseDelayMs = 400,
    maxDelayMs = 3_000,
    context = "database.operation",
  } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const retryable = isTransientDatabaseError(error);
      const isLastAttempt = attempt === maxRetries;

      if (!retryable || isLastAttempt) {
        throw error;
      }

      const exponentialDelay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jitterMs = Math.floor(Math.random() * 120);
      const delayMs = exponentialDelay + jitterMs;

      console.warn(
        `[db-retry] ${context} failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delayMs}ms.`,
      );
      await sleep(delayMs);
    }
  }

  throw new Error("Database retry exhausted unexpectedly.");
}

// Create pool with Neon-safe defaults for cold-start wakeups
export const pool = new Pool({
  connectionString: databaseUrl,
  max: parsePositiveIntEnv("DB_POOL_MAX", 20),
  idleTimeoutMillis: parsePositiveIntEnv("DB_IDLE_TIMEOUT_MS", 30_000),
  connectionTimeoutMillis: parsePositiveIntEnv("DB_CONNECTION_TIMEOUT_MS", 10_000),
});

export const db = drizzle({ client: pool, schema });

export async function warmDatabaseConnection(options: DatabaseRetryOptions = {}): Promise<void> {
  await withDatabaseRetry(
    async () => {
      await pool.query("SELECT 1");
    },
    {
      maxRetries: 2,
      baseDelayMs: 300,
      maxDelayMs: 2_500,
      context: "database.warmup",
      ...options,
    },
  );
}

// Handle Neon WebSocket connection errors gracefully
if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  process.on("uncaughtException", (error: any) => {
    if (
      error.message &&
      (error.message.includes("Cannot set property message") ||
        error.message.includes("terminating connection due to administrator command") ||
        error.message.includes("FATAL") ||
        error.code === "57P01")
    ) {
      return;
    }

    console.error("Uncaught exception:", error);
  });
}

// Handle unhandled promise rejections from database operations
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  if (reason && typeof reason === "object" && "code" in reason && reason.code === "57P01") {
    return;
  }
});

// Test database connection
export async function testDatabaseConnection() {
  try {
    await warmDatabaseConnection({
      maxRetries: 4,
      baseDelayMs: 400,
      maxDelayMs: 4_000,
      context: "database.startup",
    });
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
