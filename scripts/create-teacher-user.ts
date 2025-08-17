
import { db } from "../server/db";
import { users, schools } from "../shared/schema";
import { eq } from "drizzle-orm";
import { AuthService } from "../server/domains/auth/auth.service";

async function createTeacherUser() {
  try {
    // First, check if PSI High School exists, if not create it
    let school = await db.select().from(schools).where(eq(schools.name, "PSI High")).limit(1);
    
    if (!school.length) {
      console.log("PSI High School not found. Creating school...");
      const newSchool = await db.insert(schools).values({
        name: "PSI High",
        address: "123 Main Street",
        city: "Anytown",
        state: "FL",
        zipCode: "12345"
      }).returning();
      
      school = newSchool;
      console.log("Created PSI High School:", school[0]);
    } else {
      console.log("Found PSI High School:", school[0]);
    }

    const schoolId = school[0].id;

    // Check if teacher user already exists
    const existingTeacher = await db.select().from(users)
      .where(eq(users.username, "DGon393"))
      .limit(1);

    if (existingTeacher.length > 0) {
      console.log("Teacher user already exists:", existingTeacher[0]);
      return;
    }

    // Hash the password
    const hashedPassword = await AuthService.hashPassword("PSIHigh2025");

    // Create the teacher user
    const teacherUser = await db.insert(users).values({
      username: "teacher",
      password: hashedPassword,
      role: "teacher",
      schoolId: schoolId
    }).returning();

    console.log("Created teacher user successfully:");
    console.log({
      id: teacherUser[0].id,
      username: teacherUser[0].username,
      role: teacherUser[0].role,
      schoolId: teacherUser[0].schoolId
    });

    console.log("\nLogin credentials:");
    console.log("Username: teacher");
    console.log("Password: test1234");

  } catch (error) {
    console.error("Error creating teacher user:", error);
  }
}

// Run the script
createTeacherUser().then(() => {
  console.log("Script completed");
  process.exit(0);
}).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
