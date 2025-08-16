import { db } from "../server/db";
import { users, schools } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixStudentSchoolAssociations() {
  try {
    console.log("Fixing student school associations...\n");

    // Get all schools
    const allSchools = await db.select().from(schools);
    console.log("Schools in database:");
    allSchools.forEach(school => {
      console.log(`  ID: ${school.id}, Name: ${school.name}`);
    });
    console.log();

    if (allSchools.length === 0) {
      console.log("No schools found. Creating a default school...");
      const defaultSchool = await db.insert(schools).values({
        name: "PSI High",
        address: "123 Main Street",
        city: "Anytown",
        state: "FL",
        zipCode: "12345"
      }).returning();
      console.log("Created default school:", defaultSchool[0]);
      allSchools.push(defaultSchool[0]);
    }

    const defaultSchoolId = allSchools[0].id;

    // Get all students without school associations
    const studentsWithoutSchool = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      schoolId: users.schoolId
    }).from(users).where(eq(users.role, 'student'));

    console.log(`Found ${studentsWithoutSchool.length} students:`);
    studentsWithoutSchool.forEach(student => {
      console.log(`  ID: ${student.id}, Name: ${student.firstName} ${student.lastName}, Email: ${student.email}, SchoolID: ${student.schoolId || 'NULL'}`);
    });
    console.log();

    // Get all teachers
    const allTeachers = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      schoolId: users.schoolId
    }).from(users).where(eq(users.role, 'teacher'));

    console.log(`Found ${allTeachers.length} teachers:`);
    allTeachers.forEach(teacher => {
      console.log(`  ID: ${teacher.id}, Name: ${teacher.firstName} ${teacher.lastName}, Email: ${teacher.email}, SchoolID: ${teacher.schoolId || 'NULL'}`);
    });
    console.log();

    // Update students without school associations
    let updatedStudents = 0;
    for (const student of studentsWithoutSchool) {
      if (!student.schoolId) {
        await db.update(users)
          .set({ schoolId: defaultSchoolId })
          .where(eq(users.id, student.id));
        console.log(`Updated student ${student.firstName} ${student.lastName} to school ID ${defaultSchoolId}`);
        updatedStudents++;
      }
    }

    // Update teachers without school associations
    let updatedTeachers = 0;
    for (const teacher of allTeachers) {
      if (!teacher.schoolId) {
        await db.update(users)
          .set({ schoolId: defaultSchoolId })
          .where(eq(users.id, teacher.id));
        console.log(`Updated teacher ${teacher.firstName} ${teacher.lastName} to school ID ${defaultSchoolId}`);
        updatedTeachers++;
      }
    }

    console.log(`\nSummary:`);
    console.log(`  - Updated ${updatedStudents} students with school associations`);
    console.log(`  - Updated ${updatedTeachers} teachers with school associations`);
    console.log(`  - All users now associated with school ID ${defaultSchoolId} (${allSchools[0].name})`);

    // Verify the fix
    console.log(`\nVerifying fix...`);
    const studentsAfterFix = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      schoolId: users.schoolId
    }).from(users).where(eq(users.role, 'student'));

    const teachersAfterFix = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      schoolId: users.schoolId
    }).from(users).where(eq(users.role, 'teacher'));

    console.log(`Students with school associations: ${studentsAfterFix.filter(s => s.schoolId).length}/${studentsAfterFix.length}`);
    console.log(`Teachers with school associations: ${teachersAfterFix.filter(t => t.schoolId).length}/${teachersAfterFix.length}`);

  } catch (error) {
    console.error("Error fixing student school associations:", error);
  }
}

// Run the script
fixStudentSchoolAssociations().then(() => {
  console.log("\nScript completed");
  process.exit(0);
}).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
