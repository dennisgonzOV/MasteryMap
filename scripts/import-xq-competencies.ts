import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db.js';
import { competencies, outcomes } from '../shared/schema.js';

interface XQRow {
  'Learner Outcome': string;
  'Competency': string;
  'Description': string;
  'Component Skill': string;
  'Emerging': string;
  'Developing': string;
  'Proficient': string;
  'Applying': string;
}

async function importXQCompetencies() {
  try {
    console.log('Reading XQ Competency Rubric CSV...');
    const csvContent = readFileSync('documentation/XQ_Competency_Rubric.csv', 'utf-8');
    const records: XQRow[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    console.log(`Found ${records.length} rows in CSV`);

    // Clear existing competencies and outcomes
    console.log('Clearing existing competencies and outcomes...');
    await db.delete(outcomes);
    await db.delete(competencies);

    const competencyMap = new Map<string, number>();
    
    for (const record of records) {
      const competencyName = record.Competency;
      const learnerOutcome = record['Learner Outcome'];
      
      // Skip empty rows
      if (!competencyName || !record['Component Skill']) {
        continue;
      }

      // Create or get competency
      let competencyId = competencyMap.get(competencyName);
      if (!competencyId) {
        console.log(`Creating competency: ${competencyName}`);
        const [newCompetency] = await db.insert(competencies).values({
          name: competencyName,
          description: record.Description,
          category: getCategoryFromOutcome(learnerOutcome),
        }).returning();
        
        competencyId = newCompetency.id;
        competencyMap.set(competencyName, competencyId);
      }

      // Create outcome (component skill)
      console.log(`Creating outcome: ${record['Component Skill']}`);
      const rubricLevels = {
        emerging: record.Emerging,
        developing: record.Developing,
        proficient: record.Proficient,
        applying: record.Applying,
      };

      await db.insert(outcomes).values({
        competencyId,
        name: record['Component Skill'],
        description: record.Description,
        rubricLevels,
      });
    }

    console.log('XQ Competencies imported successfully!');
    console.log(`Created ${competencyMap.size} competencies`);
    
  } catch (error) {
    console.error('Error importing XQ competencies:', error);
    throw error;
  }
}

function getCategoryFromOutcome(learnerOutcome: string): string {
  if (learnerOutcome.includes('Foundational Knowledge')) {
    return 'foundational_knowledge';
  } else if (learnerOutcome.includes('Fundamental Literacies')) {
    return 'fundamental_literacies';
  } else if (learnerOutcome.includes('Critical Thinking')) {
    return 'critical_thinking';
  } else if (learnerOutcome.includes('Communicator')) {
    return 'communication';
  } else if (learnerOutcome.includes('Collaborator')) {
    return 'collaboration';
  } else if (learnerOutcome.includes('Designer')) {
    return 'design';
  } else if (learnerOutcome.includes('Problem Solver')) {
    return 'problem_solving';
  } else if (learnerOutcome.includes('Ethical Human')) {
    return 'ethics';
  } else if (learnerOutcome.includes('Global Citizen')) {
    return 'global_citizenship';
  } else if (learnerOutcome.includes('Lifelong Learner')) {
    return 'lifelong_learning';
  }
  return 'core';
}

// Run the import if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importXQCompetencies()
    .then(() => {
      console.log('Import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    });
}

export { importXQCompetencies };