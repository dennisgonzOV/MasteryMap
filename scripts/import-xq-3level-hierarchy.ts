import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { db } from '../server/db';
import { learnerOutcomes, competencies, componentSkills } from '../shared/schema';
import { eq } from 'drizzle-orm';

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

async function importXQ3LevelHierarchy() {
  console.log('Starting import of XQ 3-Level Hierarchy...');

  const records: XQRow[] = [];
  
  return new Promise((resolve, reject) => {
    createReadStream('documentation/XQ_Competency_Rubric.csv')
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (data) => records.push(data))
      .on('error', reject)
      .on('end', async () => {
        try {
          console.log(`Parsed ${records.length} rows from CSV`);

          // Maps to track created entities
          const learnerOutcomeMap = new Map<string, number>();
          const competencyMap = new Map<string, number>();

          for (const record of records) {
            const learnerOutcomeName = record['Learner Outcome'];
            const competencyName = record['Competency'];
            const competencyDesc = record['Description'] || '';
            const componentSkillName = record['Component Skill'];
            
            // Skip rows with missing essential data
            if (!learnerOutcomeName || !competencyName || !componentSkillName) {
              continue;
            }

            // Create or get learner outcome
            let learnerOutcomeId = learnerOutcomeMap.get(learnerOutcomeName);
            if (!learnerOutcomeId) {
              console.log(`Creating learner outcome: ${learnerOutcomeName}`);
              
              // Check if it exists
              const existing = await db.select()
                .from(learnerOutcomes)
                .where(eq(learnerOutcomes.name, learnerOutcomeName))
                .limit(1);

              if (existing.length > 0) {
                learnerOutcomeId = existing[0].id;
              } else {
                const [created] = await db.insert(learnerOutcomes)
                  .values({
                    name: learnerOutcomeName,
                    description: `Learner outcome for ${learnerOutcomeName}`,
                  })
                  .returning({ id: learnerOutcomes.id });
                learnerOutcomeId = created.id;
              }
              learnerOutcomeMap.set(learnerOutcomeName, learnerOutcomeId);
            }

            // Create or get competency
            const competencyKey = `${learnerOutcomeName}::${competencyName}`;
            let competencyId = competencyMap.get(competencyKey);
            if (!competencyId) {
              console.log(`Creating competency: ${competencyName} under ${learnerOutcomeName}`);
              
              // Check if it exists
              const existing = await db.select()
                .from(competencies)
                .where(eq(competencies.name, competencyName))
                .limit(1);

              if (existing.length > 0) {
                competencyId = existing[0].id;
              } else {
                const category = getCategoryFromCompetency(competencyName);
                const [created] = await db.insert(competencies)
                  .values({
                    learnerOutcomeId,
                    name: competencyName,
                    description: competencyDesc,
                    category,
                  })
                  .returning({ id: competencies.id });
                competencyId = created.id;
              }
              competencyMap.set(competencyKey, competencyId);
            }

            // Create component skill
            console.log(`Creating component skill: ${componentSkillName} under ${competencyName}`);
            
            // Check if it exists
            const existingSkill = await db.select()
              .from(componentSkills)
              .where(eq(componentSkills.name, componentSkillName))
              .limit(1);

            if (existingSkill.length === 0) {
              const rubricLevels = {
                emerging: record['Emerging'] || '',
                developing: record['Developing'] || '',
                proficient: record['Proficient'] || '',
                applying: record['Applying'] || '',
              };

              await db.insert(componentSkills)
                .values({
                  competencyId,
                  name: componentSkillName,
                  description: `Component skill: ${componentSkillName}`,
                  rubricLevels,
                });
            }
          }

          console.log('Import completed successfully!');
          console.log(`Created ${learnerOutcomeMap.size} learner outcomes`);
          console.log(`Created ${competencyMap.size} competencies`);
          
          resolve(null);
        } catch (error) {
          console.error('Error during import:', error);
          reject(error);
        }
      });
  });
}

function getCategoryFromCompetency(competencyName: string): string {
  // Extract category from competency codes like (FK.SS.1), (FK.AC.1), etc.
  const match = competencyName.match(/\(([^)]+)\)/);
  if (match) {
    const code = match[1];
    if (code.startsWith('FK.')) {
      return 'foundational-knowledge';
    } else if (code.startsWith('CCR.')) {
      return 'creative-critical-reasoning';
    } else if (code.startsWith('EP.')) {
      return 'engaged-practice';
    } else if (code.startsWith('EMC.')) {
      return 'effective-meaningful-communication';
    }
  }
  return 'core';
}

// Run the import
importXQ3LevelHierarchy()
  .then(() => {
    console.log('✅ XQ 3-Level Hierarchy import completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Import failed:', error);
    process.exit(1);
  });