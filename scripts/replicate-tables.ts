
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
  
  // Fixed: Remove --on-conflict-do-nothing from pg_dump (that's a psql option)
  const dumpCommand = `PGPASSWORD="${dbConfig.password}" pg_dump -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} ${tableArgs} --data-only --inserts --no-owner --no-privileges`;
  
  try {
    console.log('Running export command...');
    execSync(dumpCommand, { stdio: 'pipe' });
    
    // Write the output to file
    const output = execSync(dumpCommand, { encoding: 'utf8' });
    writeFileSync(outputFile, output);
    
    console.log(`✅ Successfully exported tables to ${outputFile}`);
  } catch (error: any) {
    console.error(`❌ Error exporting tables:`, error.message);
    throw error;
  }
}

async function importTables(targetDb: DatabaseConfig, inputFile: string) {
  const dbConfig = parseConnectionString(targetDb.connectionString);
  
  console.log(`🔄 Importing tables to ${targetDb.name} database...`);
  
  // Add ON_ERROR_STOP to fail fast on errors
  const importCommand = `PGPASSWORD="${dbConfig.password}" psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.username} -d ${dbConfig.database} -v ON_ERROR_STOP=1 -f ${inputFile}`;
  
  try {
    console.log('Running import command...');
    execSync(importCommand, { stdio: 'inherit' });
    console.log(`✅ Successfully imported tables to ${targetDb.name}`);
  } catch (error: any) {
    console.error(`❌ Error importing tables:`, error.message);
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
    console.log('Please set DEV_DATABASE_URL in your .env file');
    process.exit(1);
  }
  
  if (!prodDbUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.log('Please set DATABASE_URL in your .env file');
    process.exit(1);
  }
  
  console.log(`📍 Development DB: ${devDbUrl.split('@')[1]?.split('/')[0] || 'hidden'}`);
  console.log(`📍 Production DB: ${prodDbUrl.split('@')[1]?.split('/')[0] || 'hidden'}`);
  
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
    
    // Check if dump file was created and has content
    if (!existsSync(dumpFile)) {
      throw new Error('Dump file was not created');
    }
    
    const fileSize = require('fs').statSync(dumpFile).size;
    console.log(`📁 Dump file size: ${fileSize} bytes`);
    
    if (fileSize === 0) {
      throw new Error('Dump file is empty - no data was exported');
    }
    
    // Import tables to production database
    await importTables(targetDb, dumpFile);
    
    console.log('\n📈 Replication Summary:');
    console.log(`✅ Replicated tables: ${TABLES_TO_REPLICATE.join(', ')}`);
    console.log(`📤 Source: ${sourceDb.name}`);
    console.log(`📥 Target: ${targetDb.name}`);
    console.log('🎉 Table replication completed successfully!');
    
  } catch (error: any) {
    console.error('❌ Error during table replication:', error.message);
    
    // Provide helpful debugging info
    console.log('\n🔍 Debugging steps:');
    console.log('1. Check that both databases are accessible');
    console.log('2. Verify database credentials are correct');
    console.log('3. Ensure the tables exist in the source database');
    console.log('4. Check that pg_dump and psql are installed');
    
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
