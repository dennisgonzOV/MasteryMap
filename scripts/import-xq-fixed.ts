import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { eq } from 'drizzle-orm';
import { db } from '../server/db';
import { learnerOutcomes, competencies, componentSkills } from '../shared/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface XQRow {
  'Learner Outcome': string;
  'Competency': string;
  'Description': string; // This should be "Competency Description" but CSV shows "Description"
  'Component Skill': string;
  'Emerging': string;
  'Developing': string;
  'Proficient': string;
  'Applying': string;
}

async function importXQFixed() {
  console.log('Starting corrected import of XQ 3-Level Hierarchy...');
  
  const csvPath = join(__dirname, '../documentation/XQ_Competency_Rubric.csv');
  const fileContent = readFileSync(csvPath, 'utf-8');

  const records: XQRow[] = await new Promise((resolve, reject) => {
    parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  console.log(`Parsed ${records.length} rows from CSV`);

  // Track what we've created to avoid duplicates
  const createdLearnerOutcomes = new Map<string, { id: number; category: string }>();
  const createdCompetencies = new Map<string, number>();

  for (const row of records) {
    const learnerOutcomeName = row['Learner Outcome'];
    const competencyName = row['Competency'];
    const competencyDescription = row['Description']; // This is actually the competency description
    const componentSkillName = row['Component Skill'];

    if (!learnerOutcomeName || !competencyName || !componentSkillName) {
      continue;
    }

    // Generate category from learner outcome name
    const category = getCategoryFromLearnerOutcome(learnerOutcomeName);

    // Create or get learner outcome
    let learnerOutcome = createdLearnerOutcomes.get(learnerOutcomeName);
    if (!learnerOutcome) {
      console.log(`Creating learner outcome: ${learnerOutcomeName}`);
      
      // Check if it already exists in DB
      const existing = await db.select().from(learnerOutcomes).where(eq(learnerOutcomes.name, learnerOutcomeName));
      
      if (existing.length > 0) {
        learnerOutcome = { id: existing[0].id, category };
      } else {
        const created = await db.insert(learnerOutcomes).values({
          name: learnerOutcomeName,
          description: `Learner outcome for ${learnerOutcomeName}`,
        }).returning();
        learnerOutcome = { id: created[0].id, category };
      }
      
      createdLearnerOutcomes.set(learnerOutcomeName, learnerOutcome);
    }

    // Create or get competency
    let competencyId = createdCompetencies.get(competencyName);
    if (!competencyId) {
      console.log(`Creating competency: ${competencyName} under ${learnerOutcomeName}`);
      
      const created = await storage.db.insert(storage.db.competencies).values({
        learnerOutcomeId: learnerOutcome.id,
        name: competencyName,
        description: competencyDescription || `Competency: ${competencyName}`,
        category: learnerOutcome.category,
      }).returning();
      
      competencyId = created[0].id;
      createdCompetencies.set(competencyName, competencyId);
    }

    // Create component skill with rubric levels
    console.log(`Creating component skill: ${componentSkillName} under ${competencyName}`);
    
    const rubricLevels = {
      emerging: row['Emerging'],
      developing: row['Developing'],
      proficient: row['Proficient'],
      applying: row['Applying'],
    };

    await storage.db.insert(storage.db.componentSkills).values({
      competencyId,
      name: componentSkillName,
      rubricLevels,
    });
  }

  console.log('Import completed successfully!');
  
  // Print summary
  const outcomes = await storage.getLearnerOutcomes();
  for (const outcome of outcomes) {
    const competencies = await storage.getCompetenciesByLearnerOutcome(outcome.id);
    const totalSkills = await Promise.all(
      competencies.map(c => storage.getComponentSkillsByCompetency(c.id))
    );
    const skillCount = totalSkills.reduce((sum, skills) => sum + skills.length, 0);
    
    console.log(`${outcome.name}: ${competencies.length} competencies, ${skillCount} component skills`);
  }
}

function getCategoryFromLearnerOutcome(learnerOutcome: string): string {
  const lowercased = learnerOutcome.toLowerCase();
  
  if (lowercased.includes('foundational knowledge')) {
    return 'foundational_knowledge';
  } else if (lowercased.includes('fundamental literacies')) {
    return 'fundamental_literacies';
  } else if (lowercased.includes('original thinkers')) {
    return 'original_thinkers';
  } else if (lowercased.includes('generous collaborators')) {
    return 'generous_collaborators';
  } else if (lowercased.includes('learners for life')) {
    return 'learners_for_life';
  }
  
  return 'other';
}

// Run the import
importXQFixed().catch(console.error);