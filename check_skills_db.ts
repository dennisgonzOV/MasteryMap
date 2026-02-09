
import { db } from './server/db';
import { componentSkills, competencies } from './shared/schema';
import { count } from 'drizzle-orm';

async function check() {
  try {
    const skillsCount = await db.select({ count: count() }).from(componentSkills);
    const compsCount = await db.select({ count: count() }).from(competencies);
    console.log('Component Skills Count:', skillsCount[0].count);
    console.log('Competencies Count:', compsCount[0].count);
    process.exit(0);
  } catch (error) {
    console.error('Error checking DB:', error);
    process.exit(1);
  }
}

check();
