#!/usr/bin/env tsx

import { config } from 'dotenv';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables before importing database
config();

import { db } from '../server/db.js';
import { bestStandards } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

interface BestStandardsRow {
  'Benchmark#': string;
  'Description': string;
  'Idea/Standard': string;
  'Subject': string;
  'Grade': string;
  'Body Of Knowledge/ Strand': string;
}

interface ProcessedBestStandard {
  benchmarkNumber: string;
  description: string;
  ideaStandard: string;
  subject: string;
  grade: string;
  bodyOfKnowledge: string;
}

async function readAndParseCSV(): Promise<ProcessedBestStandard[]> {
  const csvPath = join(process.cwd(), 'documentation', 'BestStandards.csv');
  const csvContent = readFileSync(csvPath, 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as BestStandardsRow[];

  // Group records by benchmark number to handle multiple lines per standard
  const groupedRecords = new Map<string, BestStandardsRow[]>();
  
  for (const record of records) {
    const benchmarkNumber = record['Benchmark#']?.trim();
    
    if (benchmarkNumber && benchmarkNumber !== '') {
      // This is a main record with a benchmark number
      if (!groupedRecords.has(benchmarkNumber)) {
        groupedRecords.set(benchmarkNumber, []);
      }
      groupedRecords.get(benchmarkNumber)!.push(record);
    } else if (record['Description']?.trim()) {
      // This is a continuation line with additional details
      // Find the most recent benchmark number to associate it with
      const lastBenchmarkNumber = Array.from(groupedRecords.keys()).pop();
      if (lastBenchmarkNumber) {
        groupedRecords.get(lastBenchmarkNumber)!.push(record);
      }
    }
  }

  // Process grouped records into final format
  return Array.from(groupedRecords.entries()).map(([benchmarkNumber, groupRecords]) => {
    const mainRecord = groupRecords[0]; // First record has the main data
    
    // Combine all descriptions from the group
    const descriptions = groupRecords
      .map(record => record['Description']?.trim())
      .filter(desc => desc && desc !== '')
      .join('\n\n');
    
    return {
      benchmarkNumber: benchmarkNumber,
      description: descriptions,
      ideaStandard: mainRecord['Idea/Standard']?.trim() || '',
      subject: mainRecord['Subject']?.trim() || '',
      grade: mainRecord['Grade']?.trim() || '',
      bodyOfKnowledge: mainRecord['Body Of Knowledge/ Strand']?.trim() || ''
    };
  });
}

async function getExistingBestStandards(): Promise<Map<string, number>> {
  const existing = await db.select({ 
    id: bestStandards.id, 
    benchmarkNumber: bestStandards.benchmarkNumber 
  }).from(bestStandards);
  
  return new Map(existing.map(bs => [bs.benchmarkNumber, bs.id]));
}

async function insertBestStandard(data: ProcessedBestStandard): Promise<number> {
  const [result] = await db.insert(bestStandards).values({
    benchmarkNumber: data.benchmarkNumber,
    description: data.description,
    ideaStandard: data.ideaStandard,
    subject: data.subject,
    grade: data.grade,
    bodyOfKnowledge: data.bodyOfKnowledge
  }).returning({ id: bestStandards.id });
  
  console.log(`✅ Inserted B.E.S.T. standard: ${data.benchmarkNumber}`);
  return result.id;
}

async function syncBestStandards() {
  console.log('🔄 Starting B.E.S.T. Standards synchronization...');
  
  try {
    // Read and parse CSV data
    const csvData = await readAndParseCSV();
    console.log(`📊 Found ${csvData.length} rows in CSV file`);
    
    // Get existing data from database
    const existingBestStandards = await getExistingBestStandards();
    
    console.log(`📊 Found ${existingBestStandards.size} existing B.E.S.T. standards`);
    
    // Track statistics
    let newBestStandards = 0;
    let skippedBestStandards = 0;
    
    // Process each row
    for (const row of csvData) {
      if (existingBestStandards.has(row.benchmarkNumber)) {
        skippedBestStandards++;
        console.log(`⏭️  Skipped existing B.E.S.T. standard: ${row.benchmarkNumber}`);
      } else {
        await insertBestStandard(row);
        existingBestStandards.set(row.benchmarkNumber, 0); // Placeholder ID
        newBestStandards++;
      }
    }
    
    console.log('\n📈 Synchronization Summary:');
    console.log(`✅ New B.E.S.T. standards: ${newBestStandards}`);
    console.log(`⏭️  Skipped existing B.E.S.T. standards: ${skippedBestStandards}`);
    console.log('🎉 B.E.S.T. Standards synchronization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during synchronization:', error);
    process.exit(1);
  }
}

// Run the synchronization
if (import.meta.url === `file://${process.argv[1]}`) {
  syncBestStandards();
}
