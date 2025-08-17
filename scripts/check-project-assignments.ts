
import { db } from "../server/db";
import { users, projects, projectAssignments } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkProjectAssignments() {
  try {
    // Get all students
    const students = await db.select().from(users).where(eq(users.role, 'student'));
    console.log(`Found ${students.length} students`);

    // Get all projects
    const allProjects = await db.select().from(projects);
    console.log(`Found ${allProjects.length} projects`);

    // Get all project assignments
    const assignments = await db.select().from(projectAssignments);
    console.log(`Found ${assignments.length} project assignments`);

    // Check if test students have any assignments
    for (const student of students) {
      const studentAssignments = assignments.filter(a => a.studentId === student.id);
      console.log(`Student ${student.username} (ID: ${student.id}) has ${studentAssignments.length} assignments`);
    }

    // If no assignments exist, create some test assignments
    if (assignments.length === 0 && allProjects.length > 0 && students.length > 0) {
      console.log("Creating test project assignments...");
      
      // Assign first few projects to students
      for (let i = 0; i < Math.min(3, allProjects.length); i++) {
        for (const student of students) {
          await db.insert(projectAssignments).values({
            projectId: allProjects[i].id,
            studentId: student.id
          });
          console.log(`Assigned project "${allProjects[i].title}" to student ${student.username}`);
        }
      }
    }

  } catch (error) {
    console.error("Error checking project assignments:", error);
  }
}

checkProjectAssignments();
