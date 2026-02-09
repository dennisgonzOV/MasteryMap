
import 'dotenv/config';
import { db } from "../server/db";
import { users, schools } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkUsers() {
    console.log("Checking users and schools...");

    const allSchools = await db.select().from(schools);
    console.log("\nSchools:");
    allSchools.forEach(s => console.log(`- ${s.id}: ${s.name}`));

    const allUsers = await db.select().from(users);
    console.log("\nUsers:");
    allUsers.forEach(u => console.log(`- ${u.id}: ${u.username} (${u.role}), SchoolID: ${u.schoolId}`));

    process.exit(0);
}

checkUsers().catch(console.error);
