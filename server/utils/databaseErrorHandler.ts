import { QueryResult } from 'pg';
import { AppError, DatabaseError, parseDatabaseError } from './errorTypes';

/**
 * Database transaction wrapper with comprehensive error handling and rollback
 */
export class DatabaseTransaction {
  private client: any;
  private isCommitted = false;
  private isRolledBack = false;

  constructor(client: any) {
    this.client = client;
  }

  async begin(): Promise<void> {
    try {
      await this.client.query('BEGIN');
    } catch (error) {
      throw parseDatabaseError(error, 'transaction.begin');
    }
  }

  async commit(): Promise<void> {
    if (this.isRolledBack) {
      throw new DatabaseError('Cannot commit: transaction was rolled back', undefined, 'transaction.commit');
    }

    try {
      await this.client.query('COMMIT');
      this.isCommitted = true;
    } catch (error) {
      await this.safeRollback();
      throw parseDatabaseError(error, 'transaction.commit');
    }
  }

  async rollback(): Promise<void> {
    if (this.isCommitted) {
      throw new DatabaseError('Cannot rollback: transaction was already committed', undefined, 'transaction.rollback');
    }

    await this.safeRollback();
  }

  private async safeRollback(): Promise<void> {
    try {
      await this.client.query('ROLLBACK');
      this.isRolledBack = true;
    } catch (rollbackError) {
      console.error('Failed to rollback transaction:', rollbackError);
      // Even if rollback fails, mark as rolled back to prevent further operations
      this.isRolledBack = true;
    }
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    if (this.isCommitted || this.isRolledBack) {
      throw new DatabaseError('Cannot query: transaction is closed', undefined, 'transaction.query');
    }

    try {
      return await this.client.query(text, params);
    } catch (error) {
      await this.safeRollback();
      throw parseDatabaseError(error, 'transaction.query');
    }
  }

  get status() {
    if (this.isCommitted) return 'committed';
    if (this.isRolledBack) return 'rolledback';
    return 'active';
  }
}

/**
 * Safe database operation wrapper with automatic error handling
 */
export async function withTransaction<T>(
  db: any,
  operation: (tx: DatabaseTransaction) => Promise<T>,
  context?: string
): Promise<T> {
  const client = await db.connect();
  const transaction = new DatabaseTransaction(client);

  try {
    await transaction.begin();
    const result = await operation(transaction);
    await transaction.commit();
    client.release();
    return result;
  } catch (error) {
    await transaction.rollback();
    client.release();
    
    // Log transaction failure with context
    console.error('Transaction failed:', {
      context: context || 'unknown',
      error: error instanceof Error ? error.message : error,
      transactionStatus: transaction.status,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

/**
 * Safe query execution with connection management and error handling
 */
export async function safeQuery<T = any>(
  db: any,
  query: string,
  params?: any[],
  context?: string
): Promise<T[]> {
  let client;
  
  try {
    client = await db.connect();
    const result = await client.query(query, params);
    return result.rows as T[];
  } catch (error) {
    console.error('Query execution failed:', {
      context: context || 'unknown',
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      paramsCount: params?.length || 0,
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString()
    });
    
    throw parseDatabaseError(error, context);
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Connection health check with retry mechanism
 */
export async function checkDatabaseHealth(db: any, maxRetries = 3): Promise<boolean> {
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      await safeQuery(db, 'SELECT 1', [], 'health-check');
      return true;
    } catch (error) {
      attempt++;
      console.warn(`Database health check failed (attempt ${attempt}/${maxRetries}):`, {
        error: error instanceof Error ? error.message : error,
        timestamp: new Date().toISOString()
      });
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  return false;
}

/**
 * Batch operation handler with rollback on partial failure
 */
export async function batchOperation<T>(
  db: any,
  operations: Array<{ query: string; params?: any[] }>,
  context?: string
): Promise<T[]> {
  return withTransaction(db, async (tx) => {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      try {
        const result = await tx.query(op.query, op.params);
        results.push(result.rows as T);
      } catch (error) {
        throw new DatabaseError(
          `Batch operation failed at step ${i + 1}/${operations.length}`,
          error instanceof Error ? error : new Error(String(error)),
          `${context || 'batch'}.step${i + 1}`
        );
      }
    }
    
    return results;
  }, context);
}

/**
 * Database migration safety wrapper
 */
export async function safeMigration(
  db: any,
  migration: (tx: DatabaseTransaction) => Promise<void>,
  migrationName: string
): Promise<void> {
  console.log(`🔄 Running migration: ${migrationName}`);
  
  try {
    await withTransaction(db, migration, `migration.${migrationName}`);
    console.log(`✅ Migration completed: ${migrationName}`);
  } catch (error) {
    console.error(`❌ Migration failed: ${migrationName}`, {
      error: error instanceof Error ? error.message : error,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}