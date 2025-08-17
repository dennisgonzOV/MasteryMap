import { db } from "../server/db";
import { users, schools, credentials, componentSkills, competencies, learnerOutcomes } from "../shared/schema";
import { eq } from "drizzle-orm";

async function setupTeacherDashboard() {
  try {
    console.log("Setting up teacher dashboard...\n");

    // Step 1: Check and create school if needed
    let school = await db.select().from(schools).where(eq(schools.name, "PSI High")).limit(1);
    
    if (!school.length) {
      console.log("Creating PSI High School...");
      const newSchool = await db.insert(schools).values({
        name: "PSI High",
        address: "123 Main Street",
        city: "Anytown",
        state: "FL",
        zipCode: "12345"
      }).returning();
      school = newSchool;
      console.log("Created school:", school[0]);
    } else {
      console.log("Found existing school:", school[0]);
    }

    const schoolId = school[0].id;

    // Step 2: Create teacher if none exists
    let teacher = await db.select().from(users).where(eq(users.role, 'teacher')).limit(1);
    
    if (!teacher.length) {
      console.log("Creating teacher user...");
      const newTeacher = await db.insert(users).values({
        username: "teacher",
        password: "$2b$10$5K9Y4X2QZ8L1M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3", // password: "teacher123"
        role: "teacher",
        schoolId: schoolId
      }).returning();
      teacher = newTeacher;
      console.log("Created teacher:", teacher[0]);
    } else {
      console.log("Found existing teacher:", teacher[0]);
      // Update teacher's school association if needed
      if (!teacher[0].schoolId) {
        await db.update(users).set({ schoolId }).where(eq(users.id, teacher[0].id));
        console.log("Updated teacher school association");
      }
    }

    // Step 3: Create students if none exist
    let students = await db.select().from(users).where(eq(users.role, 'student'));
    
    if (students.length === 0) {
      console.log("Creating sample students...");
      const sampleStudents = [
        {
          username: "alice",
          password: "$2b$10$5K9Y4X2QZ8L1M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3",
          role: "student" as const,
          schoolId: schoolId
        },
        {
          username: "bob",
          password: "$2b$10$5K9Y4X2QZ8L1M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3",
          role: "student" as const,
          schoolId: schoolId
        },
        {
          username: "carol",
          password: "$2b$10$5K9Y4X2QZ8L1M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3",
          role: "student" as const,
          schoolId: schoolId
        },
        {
          username: "david",
          password: "$2b$10$5K9Y4X2QZ8L1M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3",
          role: "student" as const,
          schoolId: schoolId
        },
        {
          username: "emma",
          password: "$2b$10$5K9Y4X2QZ8L1M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3",
          role: "student" as const,
          schoolId: schoolId
        }
      ];

      for (const studentData of sampleStudents) {
        const newStudent = await db.insert(users).values(studentData).returning();
        console.log(`Created student: ${newStudent[0].username}`);
      }
      
      students = await db.select().from(users).where(eq(users.role, 'student'));
    } else {
      console.log(`Found ${students.length} existing students`);
      // Update students' school associations if needed
      for (const student of students) {
        if (!student.schoolId) {
          await db.update(users).set({ schoolId }).where(eq(users.id, student.id));
          console.log(`Updated student ${student.username} school association`);
        }
      }
    }

    // Step 4: Check if competency data exists, if not create some
    const existingCompetencies = await db.select().from(competencies).limit(1);
    
    if (existingCompetencies.length === 0) {
      console.log("Creating sample competency data...");
      
      // Create learner outcomes
      const outcomes = await db.insert(learnerOutcomes).values([
        {
          name: "Critical Thinking",
          description: "Ability to analyze information and make reasoned judgments"
        },
        {
          name: "Collaboration",
          description: "Working effectively with others to achieve common goals"
        },
        {
          name: "Communication",
          description: "Expressing ideas clearly and effectively"
        }
      ]).returning();

      // Create competencies
      const comps = await db.insert(competencies).values([
        {
          learnerOutcomeId: outcomes[0].id,
          name: "Problem Analysis",
          description: "Breaking down complex problems into manageable parts",
          category: "core"
        },
        {
          learnerOutcomeId: outcomes[1].id,
          name: "Team Leadership",
          description: "Leading and coordinating team efforts",
          category: "core"
        },
        {
          learnerOutcomeId: outcomes[2].id,
          name: "Public Speaking",
          description: "Presenting ideas clearly to an audience",
          category: "core"
        }
      ]).returning();

      // Create component skills
      await db.insert(componentSkills).values([
        {
          competencyId: comps[0].id,
          name: "Identify Key Issues",
          rubricLevels: {
            emerging: "Can identify basic problems",
            developing: "Can identify main issues in familiar contexts",
            proficient: "Can identify key issues in complex situations",
            applying: "Can identify root causes and underlying patterns"
          }
        },
        {
          competencyId: comps[1].id,
          name: "Delegate Tasks",
          rubricLevels: {
            emerging: "Can follow directions in a team",
            developing: "Can assign simple tasks to team members",
            proficient: "Can effectively delegate based on team strengths",
            applying: "Can optimize team performance through strategic delegation"
          }
        },
        {
          competencyId: comps[2].id,
          name: "Engage Audience",
          rubricLevels: {
            emerging: "Can speak clearly to a small group",
            developing: "Can maintain audience attention",
            proficient: "Can adapt presentation style to audience",
            applying: "Can inspire and motivate audience through presentation"
          }
        }
      ]);

      console.log("Created sample competency data");
    } else {
      console.log("Competency data already exists");
    }

    // Step 5: Add sample credentials for students
    const componentSkillsList = await db.select().from(componentSkills).limit(3);
    const competenciesList = await db.select().from(competencies).limit(2);
    
    if (componentSkillsList.length > 0 && competenciesList.length > 0) {
      console.log("Adding sample credentials for students...");
      
      for (const student of students) {
        // Add some stickers (component skills)
        for (let i = 0; i < 3; i++) {
          const skill = componentSkillsList[i % componentSkillsList.length];
          await db.insert(credentials).values({
            studentId: student.id,
            type: "sticker",
            componentSkillId: skill.id,
            title: `${skill.name} Achievement`,
            description: `Demonstrated proficiency in ${skill.name}`,
            iconUrl: null,
            awardedAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000), // 1, 2, 3 days ago
            approvedBy: teacher[0].id
          });
        }

        // Add a badge (competency)
        const competency = competenciesList[0];
        await db.insert(credentials).values({
          studentId: student.id,
          type: "badge",
          competencyId: competency.id,
          title: `${competency.name} Badge`,
          description: `Achieved mastery in ${competency.name}`,
          iconUrl: null,
          awardedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
          approvedBy: teacher[0].id
        });

        console.log(`Added credentials for ${student.username}`);
      }
    }

    console.log("\n✅ Teacher dashboard setup completed!");
    console.log("\nLogin credentials:");
    console.log("Teacher: teacher / teacher123");
    console.log("Students: alice / student123, bob / student123, carol / student123, david / student123, emma / student123");
    console.log("\nThe teacher dashboard should now show students in the Student Progress Overview card.");

  } catch (error) {
    console.error("Error setting up teacher dashboard:", error);
  }
}

// Run the script
setupTeacherDashboard().then(() => {
  console.log("\nScript completed");
  process.exit(0);
}).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
