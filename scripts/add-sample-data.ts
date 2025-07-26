import { db } from "../server/db";
import { 
  grades as gradesTable,
  submissions as submissionsTable,
  assessments as assessmentsTable,
  users as usersTable,
  componentSkills as componentSkillsTable,
  competencies as competenciesTable,
  learnerOutcomes as learnerOutcomesTable
} from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

// Sample data to populate the School Skills Tracker
async function addSampleData() {
  try {
    console.log("Adding sample data for School Skills Tracker...");

    // Get all students from the school
    const students = await db.select()
      .from(usersTable)
      .where(eq(usersTable.role, 'student'));

    console.log(`Found ${students.length} students`);

    if (students.length === 0) {
      console.log("No students found. Please add students first.");
      return;
    }

    // Get some component skills to add grades for
    const componentSkills = await db.select({
      id: componentSkillsTable.id,
      name: componentSkillsTable.name,
      competencyId: componentSkillsTable.competencyId
    })
      .from(componentSkillsTable)
      .limit(10); // Get first 10 skills

    console.log(`Found ${componentSkills.length} component skills`);

    if (componentSkills.length === 0) {
      console.log("No component skills found. Please load competency data first.");
      return;
    }

    // Create sample assessments if they don't exist
    const existingAssessments = await db.select()
      .from(assessmentsTable)
      .limit(3);

    let assessmentIds: number[] = [];

    if (existingAssessments.length < 3) {
      console.log("Creating sample assessments...");
      
      for (let i = existingAssessments.length; i < 3; i++) {
        const assessment = await db.insert(assessmentsTable).values({
          title: `Sample Assessment ${i + 1}`,
          description: `A sample assessment for testing the School Skills Tracker`,
          questions: [
            {
              id: 1,
              text: "Sample question for component skill assessment",
              type: "multiple_choice",
              options: ["Option A", "Option B", "Option C", "Option D"],
              correctAnswer: "Option A"
            }
          ],
          componentSkillIds: [componentSkills[i % componentSkills.length].id],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          shareCode: Math.random().toString(36).substring(2, 7).toUpperCase(),
          shareCodeExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }).returning({ id: assessmentsTable.id });

        assessmentIds.push(assessment[0].id);
      }
    } else {
      assessmentIds = existingAssessments.map(a => a.id);
    }

    console.log(`Using assessment IDs: ${assessmentIds.join(', ')}`);

    // Rubric levels and their corresponding scores
    const rubricLevels = [
      { level: 'emerging', scoreRange: [50, 65] },
      { level: 'developing', scoreRange: [66, 75] },
      { level: 'proficient', scoreRange: [76, 85] },
      { level: 'applying', scoreRange: [86, 100] }
    ];

    let gradesAdded = 0;
    let submissionsAdded = 0;

    // Generate sample data for each student and component skill
    for (const student of students) {
      for (const skill of componentSkills) {
        // 80% chance this student has a grade for this skill (realistic distribution)
        if (Math.random() < 0.8) {
          const assessmentId = assessmentIds[Math.floor(Math.random() * assessmentIds.length)];
          
          // Select random rubric level with realistic distribution
          // 15% emerging, 25% developing, 35% proficient, 25% applying
          const rand = Math.random();
          let rubricLevel;
          if (rand < 0.15) {
            rubricLevel = rubricLevels[0]; // emerging
          } else if (rand < 0.40) {
            rubricLevel = rubricLevels[1]; // developing  
          } else if (rand < 0.75) {
            rubricLevel = rubricLevels[2]; // proficient
          } else {
            rubricLevel = rubricLevels[3]; // applying
          }

          const score = Math.floor(
            Math.random() * (rubricLevel.scoreRange[1] - rubricLevel.scoreRange[0] + 1) + 
            rubricLevel.scoreRange[0]
          );

          // Create submission first
          const submission = await db.insert(submissionsTable).values({
            studentId: student.id,
            assessmentId: assessmentId,
            answers: [
              {
                questionId: 1,
                answer: rubricLevel.level === 'emerging' ? "Option D" : "Option A", // Wrong for emerging, right for others
                isCorrect: rubricLevel.level !== 'emerging'
              }
            ],
            submittedAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) // Random date in last 30 days
          }).returning({ id: submissionsTable.id });

          // Create grade
          await db.insert(gradesTable).values({
            studentId: student.id,
            submissionId: submission[0].id,
            componentSkillId: skill.id,
            score: score,
            rubricLevel: rubricLevel.level,
            feedback: `Sample feedback for ${rubricLevel.level} performance on ${skill.name}`,
            gradedAt: new Date(Date.now() - Math.floor(Math.random() * 25) * 24 * 60 * 60 * 1000) // Random date in last 25 days
          });

          gradesAdded++;
          submissionsAdded++;
        }
      }
    }

    console.log(`Sample data added successfully!`);
    console.log(`- ${submissionsAdded} submissions created`);
    console.log(`- ${gradesAdded} grades created`);
    console.log(`- Data covers ${componentSkills.length} component skills`);
    console.log(`- Data includes ${students.length} students`);

  } catch (error) {
    console.error("Error adding sample data:", error);
  }
}

// Run the script
addSampleData().then(() => {
  console.log("Sample data script completed");
  process.exit(0);
}).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});