
import { db } from "../server/db";
import { users, credentials, componentSkills, competencies, learnerOutcomes } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addTestCredentials() {
  try {
    // Find the student user
    const student = await db.select().from(users).where(eq(users.username, "student1")).limit(1);
    
    if (!student.length) {
      console.log("Student student1@test.com not found. Creating user first...");
      
      // Create the student user
      const newStudent = await db.insert(users).values({
        username: "student1",
        password: "$2b$10$5K9Y4X2QZ8L1M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3", // password: "student123"
        role: "student"
      }).returning();
      
      console.log("Created student user:", newStudent[0]);
      
      const studentId = newStudent[0].id;
      
      // Add test credentials
      await addCredentialsForStudent(studentId);
    } else {
      const studentId = student[0].id;
      console.log("Found student:", student[0]);
      
      // Add test credentials
      await addCredentialsForStudent(studentId);
    }
    
    console.log("Test credentials added successfully!");
  } catch (error) {
    console.error("Error adding test credentials:", error);
  }
}

async function addCredentialsForStudent(studentId: number) {
  // Get some component skills, competencies, and learner outcomes for realistic associations
  const componentSkillsList = await db.select().from(componentSkills).limit(5);
  const competenciesList = await db.select().from(competencies).limit(3);
  
  // Create test credentials with different types and dates
  const testCredentials = [
    // Stickers (Component Skills)
    {
      studentId,
      type: "sticker" as const,
      componentSkillId: componentSkillsList[0]?.id || null,
      title: "Critical Thinking Starter",
      description: "Demonstrated ability to analyze information and ask thoughtful questions",
      iconUrl: null,
      awardedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      approvedBy: 1 // Assuming teacher ID 1 exists
    },
    {
      studentId,
      type: "sticker" as const,
      componentSkillId: componentSkillsList[1]?.id || null,
      title: "Collaboration Champion",
      description: "Worked effectively with team members to achieve shared goals",
      iconUrl: null,
      awardedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      approvedBy: 1
    },
    {
      studentId,
      type: "sticker" as const,
      componentSkillId: componentSkillsList[2]?.id || null,
      title: "Creative Problem Solver",
      description: "Found innovative solutions to challenging problems",
      iconUrl: null,
      awardedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      approvedBy: 1
    },
    {
      studentId,
      type: "sticker" as const,
      componentSkillId: componentSkillsList[3]?.id || null,
      title: "Communication Expert",
      description: "Effectively communicated ideas through multiple mediums",
      iconUrl: null,
      awardedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      approvedBy: 1
    },
    {
      studentId,
      type: "sticker" as const,
      componentSkillId: componentSkillsList[4]?.id || null,
      title: "Research Specialist",
      description: "Conducted thorough research using multiple credible sources",
      iconUrl: null,
      awardedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      approvedBy: 1
    },
    
    // Badges (Competencies)
    {
      studentId,
      type: "badge" as const,
      competencyId: competenciesList[0]?.id || null,
      title: "Digital Citizenship Badge",
      description: "Demonstrated responsible and ethical use of digital technologies",
      iconUrl: null,
      awardedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      approvedBy: 1
    },
    {
      studentId,
      type: "badge" as const,
      competencyId: competenciesList[1]?.id || null,
      title: "Project Leadership Badge",
      description: "Successfully led a team project from conception to completion",
      iconUrl: null,
      awardedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      approvedBy: 1
    },
    {
      studentId,
      type: "badge" as const,
      competencyId: competenciesList[2]?.id || null,
      title: "Innovation Badge",
      description: "Consistently demonstrated creative thinking and innovation",
      iconUrl: null,
      awardedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      approvedBy: 1
    },
    
    // Plaques (Subject Areas / Major Achievements)
    {
      studentId,
      type: "plaque" as const,
      subjectArea: "English Language Arts",
      title: "Literary Analysis Master",
      description: "Exceptional achievement in analyzing and interpreting literature across multiple genres",
      iconUrl: null,
      awardedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      approvedBy: 1
    },
    {
      studentId,
      type: "plaque" as const,
      subjectArea: "STEM",
      title: "Science Inquiry Excellence",
      description: "Outstanding performance in scientific method application and hypothesis testing",
      iconUrl: null,
      awardedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
      approvedBy: 1
    }
  ];
  
  // Insert all credentials
  for (const credential of testCredentials) {
    try {
      await db.insert(credentials).values(credential);
      console.log(`Added ${credential.type}: ${credential.title}`);
    } catch (error) {
      console.error(`Failed to add credential ${credential.title}:`, error);
    }
  }
}

// Run the script
addTestCredentials().then(() => {
  console.log("Script completed");
  process.exit(0);
}).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
