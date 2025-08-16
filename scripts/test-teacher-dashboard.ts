import { db } from "../server/db";
import { users, schools } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testTeacherDashboard() {
  try {
    console.log("Testing teacher dashboard setup...\n");

    // Check schools
    const schoolsList = await db.select().from(schools);
    console.log(`Schools: ${schoolsList.length}`);
    schoolsList.forEach(school => {
      console.log(`  - ${school.name} (ID: ${school.id})`);
    });

    // Check teachers
    const teachers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      schoolId: users.schoolId
    }).from(users).where(eq(users.role, 'teacher'));

    console.log(`\nTeachers: ${teachers.length}`);
    teachers.forEach(teacher => {
      console.log(`  - ${teacher.firstName} ${teacher.lastName} (ID: ${teacher.id}, SchoolID: ${teacher.schoolId || 'NULL'})`);
    });

    // Check students
    const students = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      schoolId: users.schoolId
    }).from(users).where(eq(users.role, 'student'));

    console.log(`\nStudents: ${students.length}`);
    students.forEach(student => {
      console.log(`  - ${student.firstName} ${student.lastName} (ID: ${student.id}, SchoolID: ${student.schoolId || 'NULL'})`);
    });

    // Test the specific query that the dashboard uses
    if (teachers.length > 0) {
      const teacherId = teachers[0].id;
      console.log(`\nTesting dashboard query for teacher ID: ${teacherId}`);
      
      // Get the teacher's school ID
      const teacher = await db.select({ schoolId: users.schoolId })
        .from(users)
        .where(eq(users.id, teacherId))
        .limit(1);

      if (teacher.length && teacher[0].schoolId) {
        console.log(`Teacher school ID: ${teacher[0].schoolId}`);
        
        // Get students in the same school
        const schoolStudents = await db.select()
          .from(users)
          .where(eq(users.schoolId, teacher[0].schoolId))
          .orderBy(users.firstName);

        console.log(`Students in same school: ${schoolStudents.length}`);
        schoolStudents.forEach(student => {
          console.log(`  - ${student.firstName} ${student.lastName} (${student.role})`);
        });
      } else {
        console.log("Teacher has no school ID!");
      }
    }

    console.log("\n✅ Test completed!");

  } catch (error) {
    console.error("Error testing teacher dashboard:", error);
  }
}

// Run the script
testTeacherDashboard().then(() => {
  console.log("\nScript completed");
  process.exit(0);
}).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
