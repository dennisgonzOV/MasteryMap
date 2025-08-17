#!/usr/bin/env tsx

import { config } from 'dotenv';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables before importing database
config();

import { db } from '../server/db.js';
import { learnerOutcomes, competencies, componentSkills } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

interface XQCompetencyRow {
  'Learner Outcome': string;
  'Competency': string;
  'Competency Description': string;
  'Component Skill': string;
  'Emerging': string;
  'Developing': string;
  'Proficient': string;
  'Applying': string;
}

interface ProcessedData {
  learnerOutcome: string;
  competency: string;
  competencyDescription: string;
  componentSkill: string;
  rubricLevels: {
    emerging: string;
    developing: string;
    proficient: string;
    applying: string;
  };
}

async function readAndParseCSV(): Promise<ProcessedData[]> {
  const csvPath = join(process.cwd(), 'documentation', 'XQ_Competency_Rubric.csv');
  const csvContent = readFileSync(csvPath, 'utf-8');
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as XQCompetencyRow[];

  return records.map(record => ({
    learnerOutcome: record['Learner Outcome'].trim(),
    competency: record['Competency'].trim(),
    competencyDescription: record['Competency Description']?.trim() || '',
    componentSkill: record['Component Skill'].trim(),
    rubricLevels: {
      emerging: record['Emerging']?.trim() || '',
      developing: record['Developing']?.trim() || '',
      proficient: record['Proficient']?.trim() || '',
      applying: record['Applying']?.trim() || ''
    }
  }));
}

async function getExistingLearnerOutcomes(): Promise<Map<string, number>> {
  const existing = await db.select({ id: learnerOutcomes.id, name: learnerOutcomes.name }).from(learnerOutcomes);
  return new Map(existing.map(lo => [lo.name, lo.id]));
}

async function getExistingCompetencies(): Promise<Map<string, number>> {
  const existing = await db.select({ id: competencies.id, name: competencies.name }).from(competencies);
  return new Map(existing.map(c => [c.name, c.id]));
}

async function getExistingComponentSkills(): Promise<Map<string, number>> {
  const existing = await db.select({ id: componentSkills.id, name: componentSkills.name }).from(componentSkills);
  return new Map(existing.map(cs => [cs.name, cs.id]));
}

async function insertLearnerOutcome(name: string): Promise<number> {
  const [result] = await db.insert(learnerOutcomes).values({ name }).returning({ id: learnerOutcomes.id });
  console.log(`✅ Inserted learner outcome: ${name}`);
  return result.id;
}

async function insertCompetency(name: string, description: string, learnerOutcomeId: number): Promise<number> {
  const [result] = await db.insert(competencies).values({ 
    name, 
    description,
    learnerOutcomeId 
  }).returning({ id: competencies.id });
  console.log(`✅ Inserted competency: ${name}`);
  return result.id;
}

async function insertComponentSkill(name: string, competencyId: number, rubricLevels: any): Promise<number> {
  const [result] = await db.insert(componentSkills).values({ 
    name, 
    competencyId,
    rubricLevels 
  }).returning({ id: componentSkills.id });
  console.log(`✅ Inserted component skill: ${name}`);
  return result.id;
}

async function syncXQCompetencies() {
  console.log('🔄 Starting XQ Competency synchronization...');
  
  try {
    // Read and parse CSV data
    const csvData = await readAndParseCSV();
    console.log(`📊 Found ${csvData.length} rows in CSV file`);
    
    // Get existing data from database
    const existingLearnerOutcomes = await getExistingLearnerOutcomes();
    const existingCompetencies = await getExistingCompetencies();
    const existingComponentSkills = await getExistingComponentSkills();
    
    console.log(`📊 Found ${existingLearnerOutcomes.size} existing learner outcomes`);
    console.log(`📊 Found ${existingCompetencies.size} existing competencies`);
    console.log(`📊 Found ${existingComponentSkills.size} existing component skills`);
    
    // Track statistics
    let newLearnerOutcomes = 0;
    let newCompetencies = 0;
    let newComponentSkills = 0;
    let skippedComponentSkills = 0;
    
    // Process each row
    for (const row of csvData) {
      // Handle Learner Outcome
      let learnerOutcomeId: number;
      if (existingLearnerOutcomes.has(row.learnerOutcome)) {
        learnerOutcomeId = existingLearnerOutcomes.get(row.learnerOutcome)!;
      } else {
        learnerOutcomeId = await insertLearnerOutcome(row.learnerOutcome);
        existingLearnerOutcomes.set(row.learnerOutcome, learnerOutcomeId);
        newLearnerOutcomes++;
      }
      
      // Handle Competency
      let competencyId: number;
      if (existingCompetencies.has(row.competency)) {
        competencyId = existingCompetencies.get(row.competency)!;
      } else {
        competencyId = await insertCompetency(row.competency, row.competencyDescription, learnerOutcomeId);
        existingCompetencies.set(row.competency, competencyId);
        newCompetencies++;
      }
      
      // Handle Component Skill
      if (existingComponentSkills.has(row.componentSkill)) {
        skippedComponentSkills++;
        console.log(`⏭️  Skipped existing component skill: ${row.componentSkill}`);
      } else {
        await insertComponentSkill(row.componentSkill, competencyId, row.rubricLevels);
        existingComponentSkills.set(row.componentSkill, 0); // Placeholder ID
        newComponentSkills++;
      }
    }
    
    console.log('\n📈 Synchronization Summary:');
    console.log(`✅ New learner outcomes: ${newLearnerOutcomes}`);
    console.log(`✅ New competencies: ${newCompetencies}`);
    console.log(`✅ New component skills: ${newComponentSkills}`);
    console.log(`⏭️  Skipped existing component skills: ${skippedComponentSkills}`);
    console.log('🎉 XQ Competency synchronization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during synchronization:', error);
    process.exit(1);
  }
}

// Run the synchronization
if (import.meta.url === `file://${process.argv[1]}`) {
  syncXQCompetencies();
}
