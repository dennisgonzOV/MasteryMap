import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db.js';
import { learnerOutcomes, competencies, componentSkills } from '../shared/schema.js';

interface XQRow {
  'Learner Outcome': string;
  'Competency': string;
  'Competency Description': string;
  'Component Skill': string;
  'Emerging': string;
  'Developing': string;
  'Proficient': string;
  'Applying': string;
}

function getCategoryFromLearnerOutcome(learnerOutcome: string): string {
  if (learnerOutcome.includes('Foundational Knowledge')) return 'foundational_knowledge';
  if (learnerOutcome.includes('Fundamental Literacies')) return 'fundamental_literacies';
  if (learnerOutcome.includes('Original Thinkers')) return 'original_thinkers';
  if (learnerOutcome.includes('Generous Collaborators')) return 'generous_collaborators';
  if (learnerOutcome.includes('Learners for Life')) return 'learners_for_life';
  return 'other';
}

async function importCompleteCSV() {
  try {
    // Read and parse CSV
    const csvContent = await fs.readFile('./documentation/XQ_Competency_Rubric.csv', 'utf-8');
    const rows = parse(csvContent, { 
      columns: true, 
      skip_empty_lines: true,
      trim: true 
    }) as XQRow[];
    
    console.log(`Found ${rows.length} rows in CSV`);
    
    // Track created items
    const learnerOutcomeMap = new Map<string, number>();
    const competencyMap = new Map<string, number>();
    
    // Process each row
    for (const row of rows) {
      const learnerOutcomeName = row['Learner Outcome'];
      const competencyName = row['Competency'];
      const competencyDescription = row['Competency Description'];
      const componentSkillName = row['Component Skill'];
      
      // Skip if missing required fields
      if (!learnerOutcomeName || !competencyName || !componentSkillName) {
        console.log('Skipping row with missing required fields:', row);
        continue;
      }
      
      // Create or get learner outcome
      let learnerOutcomeId = learnerOutcomeMap.get(learnerOutcomeName);
      if (!learnerOutcomeId) {
        const [insertedLearnerOutcome] = await db
          .insert(learnerOutcomes)
          .values({
            name: learnerOutcomeName,
            description: `Learner outcome for ${learnerOutcomeName}`,
          })
          .returning({ id: learnerOutcomes.id });
        
        learnerOutcomeId = insertedLearnerOutcome.id;
        learnerOutcomeMap.set(learnerOutcomeName, learnerOutcomeId);
        console.log(`Created learner outcome: ${learnerOutcomeName} (ID: ${learnerOutcomeId})`);
      }
      
      // Create or get competency
      let competencyId = competencyMap.get(competencyName);
      if (!competencyId) {
        const category = getCategoryFromLearnerOutcome(learnerOutcomeName);
        const [insertedCompetency] = await db
          .insert(competencies)
          .values({
            name: competencyName,
            description: competencyDescription || `Competency for ${competencyName}`,
            category: category,
            learnerOutcomeId: learnerOutcomeId,
          })
          .returning({ id: competencies.id });
        
        competencyId = insertedCompetency.id;
        competencyMap.set(competencyName, competencyId);
        console.log(`Created competency: ${competencyName} (ID: ${competencyId})`);
      }
      
      // Create component skill with rubric levels
      const rubricLevels = {
        emerging: row['Emerging'],
        developing: row['Developing'],
        proficient: row['Proficient'],
        applying: row['Applying'],
      };
      
      const [insertedComponentSkill] = await db
        .insert(componentSkills)
        .values({
          name: componentSkillName,
          competencyId: competencyId,
          rubricLevels: rubricLevels,
        })
        .returning({ id: componentSkills.id });
      
      console.log(`Created component skill: ${componentSkillName} (ID: ${insertedComponentSkill.id})`);
    }
    
    // Report final counts
    const learnerOutcomeCount = await db.select().from(learnerOutcomes);
    const competencyCount = await db.select().from(competencies);
    const componentSkillCount = await db.select().from(componentSkills);
    
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Learner Outcomes: ${learnerOutcomeCount.length}`);
    console.log(`Competencies: ${competencyCount.length}`);
    console.log(`Component Skills: ${componentSkillCount.length}`);
    
  } catch (error) {
    console.error('Error importing CSV:', error);
    process.exit(1);
  }
}

// Run the import
importCompleteCSV().then(() => {
  console.log('Import completed successfully');
  process.exit(0);
});