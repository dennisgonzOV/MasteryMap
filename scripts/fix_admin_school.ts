
import 'dotenv/config';
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixAdminSchool() {
    console.log("Updating admin school...");

    // Update admin (id 55) to school 1 (PSI High School)
    // Or find by username 'admin' to be safe
    await db.update(users)
        .set({ schoolId: 1 })
        .where(eq(users.username, "admin"));

    console.log("Updated admin user to School ID 1.");
    process.exit(0);
}

fixAdminSchool().catch(console.error);
