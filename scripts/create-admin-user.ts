
import { db } from "../server/db";
import { users, schools } from "../shared/schema";
import { eq } from "drizzle-orm";
import { AuthService } from "../server/auth";

async function createAdminUser() {
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

    // Check if admin user already exists
    const existingAdmin = await db.select().from(users)
      .where(eq(users.email, "psiadmin@test.com"))
      .limit(1);

    if (existingAdmin.length > 0) {
      console.log("Admin user already exists:", existingAdmin[0]);
      return;
    }

    // Hash the password
    const hashedPassword = await AuthService.hashPassword("test1234");

    // Create the admin user
    const adminUser = await db.insert(users).values({
      email: "psiadmin@test.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "admin",
      schoolId: schoolId,
      emailConfirmed: true
    }).returning();

    console.log("Created admin user successfully:");
    console.log({
      id: adminUser[0].id,
      email: adminUser[0].email,
      firstName: adminUser[0].firstName,
      lastName: adminUser[0].lastName,
      role: adminUser[0].role,
      schoolId: adminUser[0].schoolId
    });

    console.log("\nLogin credentials:");
    console.log("Email: psiadmin@test.com");
    console.log("Password: test1234");

  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

// Run the script
createAdminUser().then(() => {
  console.log("Script completed");
  process.exit(0);
}).catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
