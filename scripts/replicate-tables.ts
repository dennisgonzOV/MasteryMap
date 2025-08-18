
#!/usr/bin/env tsx

import { config } from 'dotenv';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
config();

const TABLES_TO_REPLICATE = [
  'best_standards',
  'competencies', 
  'component_skills',
  'learner_outcomes'
];

interface DatabaseConfig {
  connectionString: string;
  name: string;
}

function parseConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  return {
    host: url.hostname,
    port: url.port || '5432',
    database: url.pathname.slice(1), // remove leading slash
    username: url.username,
    password: url.password
  };
}

async function exportTables(sourceDb: DatabaseConfig, outputFile: string) {
  const dbConfig = parseConnectionString(sourceDb.connectionString);
  
  console.log(`🔄 Exporting tables from ${sourceDb.name} database...`);
  
  const tableArgs = TABLES_TO_REPLICATE.map(table => `--table=${table}`).join(' ');
  
  const dumpCommand = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} ${tableArgs} --data-only --inserts --on-conflict-do-nothing > ${outputFile}`;
  
  try {
    execSync(dumpCommand, { stdio: 'inherit' });
    console.log(`✅ Successfully exported tables to ${outputFile}`);
  } catch (error) {
    console.error(`❌ Error exporting tables:`, error);
    throw error;
  }
}

async function importTables(targetDb: DatabaseConfig, inputFile: string) {
  const dbConfig = parseConnectionString(targetDb.connectionString);
  
  console.log(`🔄 Importing tables to ${targetDb.name} database...`);
  
  const importCommand = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -f ${inputFile}`;
  
  try {
    execSync(importCommand, { stdio: 'inherit' });
    console.log(`✅ Successfully imported tables to ${targetDb.name}`);
  } catch (error) {
    console.error(`❌ Error importing tables:`, error);
    throw error;
  }
}

async function replicateTables() {
  console.log('🚀 Starting table replication...');
  
  // Get database connection strings from environment
  const devDbUrl = process.env.DEV_DATABASE_URL;
  const prodDbUrl = process.env.DATABASE_URL;
  
  if (!devDbUrl) {
    console.error('❌ DEV_DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  if (!prodDbUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }
  
  const sourceDb: DatabaseConfig = {
    connectionString: devDbUrl,
    name: 'development'
  };
  
  const targetDb: DatabaseConfig = {
    connectionString: prodDbUrl,
    name: 'production'
  };
  
  const dumpFile = join(process.cwd(), 'table_dump.sql');
  
  try {
    // Export tables from development database
    await exportTables(sourceDb, dumpFile);
    
    // Import tables to production database
    await importTables(targetDb, dumpFile);
    
    console.log('\n📈 Replication Summary:');
    console.log(`✅ Replicated tables: ${TABLES_TO_REPLICATE.join(', ')}`);
    console.log(`📤 Source: ${sourceDb.name}`);
    console.log(`📥 Target: ${targetDb.name}`);
    console.log('🎉 Table replication completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during table replication:', error);
    process.exit(1);
  } finally {
    // Clean up dump file
    if (existsSync(dumpFile)) {
      unlinkSync(dumpFile);
      console.log('🧹 Cleaned up temporary dump file');
    }
  }
}

// Run the replication
if (import.meta.url === `file://${process.argv[1]}`) {
  replicateTables();
}
