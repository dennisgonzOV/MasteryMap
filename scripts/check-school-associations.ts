
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
import { eq, count, desc } from "drizzle-orm";

async function checkSchoolAssociations() {
  try {
    console.log("=== CHECKING SCHOOL SKILLS TRACKER DATA ===\n");

    // Check users
    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role
    }).from(usersTable);
    
    console.log(`📊 Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });
    console.log("");

    // Check component skills
    const componentSkills = await db.select({
      id: componentSkillsTable.id,
      name: componentSkillsTable.name,
      competencyId: componentSkillsTable.competencyId
    }).from(componentSkillsTable);
    
    console.log(`🎯 Found ${componentSkills.length} component skills`);
    if (componentSkills.length > 0) {
      console.log(`  - First 5: ${componentSkills.slice(0, 5).map(s => s.name).join(', ')}`);
    }
    console.log("");

    // Check assessments
    const assessments = await db.select({
      id: assessmentsTable.id,
      title: assessmentsTable.title,
      componentSkillIds: assessmentsTable.componentSkillIds
    }).from(assessmentsTable);
    
    console.log(`📝 Found ${assessments.length} assessments:`);
    assessments.forEach(assessment => {
      console.log(`  - "${assessment.title}" (ID: ${assessment.id})`);
      console.log(`    Component Skills: ${JSON.stringify(assessment.componentSkillIds)}`);
    });
    console.log("");

    // Check submissions
    const submissions = await db.select({
      id: submissionsTable.id,
      studentId: submissionsTable.studentId,
      assessmentId: submissionsTable.assessmentId,
      submittedAt: submissionsTable.submittedAt
    }).from(submissionsTable).orderBy(desc(submissionsTable.submittedAt));
    
    console.log(`📋 Found ${submissions.length} submissions:`);
    submissions.forEach(submission => {
      const student = users.find(u => u.id === submission.studentId);
      const assessment = assessments.find(a => a.id === submission.assessmentId);
      console.log(`  - Student: ${student?.email} | Assessment: ${assessment?.title} | Date: ${submission.submittedAt}`);
    });
    console.log("");

    // Check grades
    const grades = await db.select({
      id: gradesTable.id,
      studentId: gradesTable.studentId,
      submissionId: gradesTable.submissionId,
      componentSkillId: gradesTable.componentSkillId,
      score: gradesTable.score,
      rubricLevel: gradesTable.rubricLevel,
      gradedAt: gradesTable.gradedAt
    }).from(gradesTable).orderBy(desc(gradesTable.gradedAt));
    
    console.log(`📊 Found ${grades.length} grades:`);
    grades.forEach(grade => {
      const student = users.find(u => u.id === grade.studentId);
      const skill = componentSkills.find(s => s.id === grade.componentSkillId);
      console.log(`  - Student: ${student?.email} | Skill: ${skill?.name} | Score: ${grade.score} | Level: ${grade.rubricLevel}`);
    });
    console.log("");

    // Check teacher associations
    const teachers = users.filter(u => u.role === 'teacher');
    console.log(`👩‍🏫 Found ${teachers.length} teachers`);
    
    // Check what data each teacher should see
    for (const teacher of teachers) {
      console.log(`\n🔍 Checking data for teacher: ${teacher.email}`);
      
      // Get grades for students (in a real school system, this would be filtered by school/class)
      const teacherVisibleGrades = grades; // For now, teachers can see all grades
      
      console.log(`  - Can see ${teacherVisibleGrades.length} grades`);
      
      if (teacherVisibleGrades.length > 0) {
        const skillCounts = {};
        teacherVisibleGrades.forEach(grade => {
          const skill = componentSkills.find(s => s.id === grade.componentSkillId);
          if (skill) {
            skillCounts[skill.name] = (skillCounts[skill.name] || 0) + 1;
          }
        });
        
        console.log(`  - Grade distribution by skill:`);
        Object.entries(skillCounts).forEach(([skillName, count]) => {
          console.log(`    * ${skillName}: ${count} grades`);
        });
      }
    }

    // Check API endpoint data structure
    console.log("\n🔌 Checking API endpoint data...");
    
    // Simulate what the school-component-skills-progress endpoint should return
    const schoolStatsData = [];
    
    for (const skill of componentSkills) {
      const skillGrades = grades.filter(g => g.componentSkillId === skill.id);
      
      if (skillGrades.length > 0) {
        const scores = skillGrades.map(g => g.score);
        const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        
        const rubricCounts = {
          emerging: skillGrades.filter(g => g.rubricLevel === 'emerging').length,
          developing: skillGrades.filter(g => g.rubricLevel === 'developing').length,
          proficient: skillGrades.filter(g => g.rubricLevel === 'proficient').length,
          applying: skillGrades.filter(g => g.rubricLevel === 'applying').length
        };
        
        schoolStatsData.push({
          componentSkillId: skill.id,
          componentSkillName: skill.name,
          totalStudentsAssessed: skillGrades.length,
          averageScore: Math.round(averageScore * 100) / 100,
          rubricDistribution: rubricCounts,
          competencyId: skill.competencyId
        });
      }
    }
    
    console.log(`📈 School Stats Data (${schoolStatsData.length} skills with data):`);
    schoolStatsData.forEach(data => {
      console.log(`  - ${data.componentSkillName}: ${data.totalStudentsAssessed} assessments, avg ${data.averageScore}`);
    });

    if (schoolStatsData.length === 0) {
      console.log("❌ NO DATA FOUND - This explains why School Skills Tracker shows empty!");
      console.log("\nPossible issues:");
      console.log("1. No grades exist in the database");
      console.log("2. Grades are not properly linked to component skills");
      console.log("3. Component skills are not properly loaded");
      console.log("4. API endpoint is not correctly querying the data");
    } else {
      console.log("✅ Data exists - API endpoint issue likely");
    }

  } catch (error) {
    console.error("Error checking school associations:", error);
  }
}

// Run the script
checkSchoolAssociations().then(() => {
  console.log("\n=== CHECK COMPLETE ===");
  process.exit(0);
}).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
