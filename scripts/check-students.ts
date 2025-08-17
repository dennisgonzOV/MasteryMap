import { db } from "../server/db";
import { users, schools } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkStudents() {
  try {
    console.log("Checking students and their school associations...\n");

    // Get all schools
    const allSchools = await db.select().from(schools);
    console.log("Schools in database:");
    allSchools.forEach(school => {
      console.log(`  ID: ${school.id}, Name: ${school.name}`);
    });
    console.log();

    // Get all students
    const allStudents = await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      schoolId: users.schoolId
    }).from(users).where(eq(users.role, 'student'));

    console.log(`Found ${allStudents.length} students:`);
    allStudents.forEach(student => {
      console.log(`  ID: ${student.id}, Username: ${student.username}, SchoolID: ${student.schoolId || 'NULL'}`);
    });
    console.log();

    // Get all teachers
    const allTeachers = await db.select({
      id: users.id,
      username: users.username,
      role: users.role,
      schoolId: users.schoolId
    }).from(users).where(eq(users.role, 'teacher'));

    console.log(`Found ${allTeachers.length} teachers:`);
    allTeachers.forEach(teacher => {
      console.log(`  ID: ${teacher.id}, Username: ${teacher.username}, SchoolID: ${teacher.schoolId || 'NULL'}`);
    });

  } catch (error) {
    console.error("Error checking students:", error);
  }
}

// Run the script
checkStudents().then(() => {
  console.log("\nScript completed");
  process.exit(0);
}).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
