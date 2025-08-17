
import { db } from "../server/db";
import { users as usersTable, schools as schoolsTable } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateAdminSchool() {
  try {
    console.log("=== UPDATING ADMIN SCHOOL AND CLEANING UP DUPLICATES ===\n");

    // First, let's see the current state
    console.log("Current schools:");
    const allSchools = await db.select().from(schoolsTable);
    allSchools.forEach(school => {
      console.log(`- ID: ${school.id}, Name: ${school.name}`);
    });
    console.log("");

    console.log("Current admin user:");
    const admin = await db.select().from(usersTable).where(eq(usersTable.username, "admin")).limit(1);
    if (admin.length > 0) {
      console.log(`- Username: ${admin[0].username}, Current School ID: ${admin[0].schoolId}`);
    } else {
      console.log("Admin user not found!");
      return;
    }
    console.log("");

    // Find the correct PSI High School entry (assuming ID 1 is the correct one)
    const psiHighSchool = allSchools.find(school => 
      school.name === "PSI High School" && school.id !== 2
    );

    if (!psiHighSchool) {
      console.log("Could not find PSI High School entry (excluding ID 2)");
      return;
    }

    console.log(`Using PSI High School with ID: ${psiHighSchool.id}`);

    // Update the admin user's school to the correct PSI High School
    console.log("Updating admin user's school...");
    await db.update(usersTable)
      .set({ schoolId: psiHighSchool.id })
      .where(eq(usersTable.username, "admin"));
    
    console.log("✓ Admin user school updated");

    // Remove the duplicate PSI High School entry (ID 2)
    console.log("Removing duplicate PSI High School entry (ID 2)...");
    
    // First check if there are any users associated with school ID 2
    const usersWithSchoolId2 = await db.select().from(usersTable).where(eq(usersTable.schoolId, 2));
    
    if (usersWithSchoolId2.length > 0) {
      console.log(`Found ${usersWithSchoolId2.length} users associated with school ID 2. Moving them to school ID ${psiHighSchool.id}...`);
      
      // Update all users from school ID 2 to the correct PSI High School
      await db.update(usersTable)
        .set({ schoolId: psiHighSchool.id })
        .where(eq(usersTable.schoolId, 2));
      
      console.log("✓ Users moved to correct school");
    }

    // Now delete the duplicate school entry
    await db.delete(schoolsTable).where(eq(schoolsTable.id, 2));
    console.log("✓ Duplicate school entry removed");

    // Verify the changes
    console.log("\n=== VERIFICATION ===");
    console.log("Updated schools:");
    const updatedSchools = await db.select().from(schoolsTable);
    updatedSchools.forEach(school => {
      console.log(`- ID: ${school.id}, Name: ${school.name}`);
    });

    console.log("\nUpdated admin user:");
    const updatedAdmin = await db.select().from(usersTable).where(eq(usersTable.username, "admin")).limit(1);
    if (updatedAdmin.length > 0) {
      console.log(`- Username: ${updatedAdmin[0].username}, School ID: ${updatedAdmin[0].schoolId}`);
    }

    console.log("\n✅ All updates completed successfully!");

  } catch (error) {
    console.error('Error updating admin school:', error);
    process.exit(1);
  }
}

updateAdminSchool().then(() => {
  process.exit(0);
});
