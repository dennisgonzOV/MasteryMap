
import 'dotenv/config';
import { db } from "../server/db";
import { users, schools, UserRole } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function createTestAdmin() {
    console.log("Starting admin creation...");

    // 1. Ensure a school exists
    let school = await db.query.schools.findFirst({
        where: eq(schools.name, "Test School"),
    });

    if (!school) {
        console.log("Test School not found. Creating one...");
        const result = await db.insert(schools).values({
            name: "Test School",
            address: "123 Test St",
            city: "Test City",
            state: "TS",
            zipCode: "12345",
        }).returning();
        school = result[0];
        console.log("Created school:", school.id, school.name);
    } else {
        console.log("Found existing school:", school.id, school.name);
    }

    // 2. Ensure admin user exists
    const username = "admin";
    const password = "password123";

    const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
    });

    if (existingUser) {
        console.log("Admin user already exists:", existingUser.username);
        // Optional: Update password or role if needed, but for now just report it
        if (existingUser.role !== UserRole.ADMIN) {
            console.log("User exists but is not admin. Updating role...");
            await db.update(users).set({ role: UserRole.ADMIN }).where(eq(users.id, existingUser.id));
            console.log("User role updated to admin.");
        }
    } else {
        console.log("Creating admin user...");
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await db.insert(users).values({
            username,
            password: hashedPassword,
            role: UserRole.ADMIN,
            schoolId: school.id,
            tier: "enterprise",
        }).returning();

        console.log("Created admin user:", newUser[0].username, "with ID:", newUser[0].id);
    }

    console.log("Done.");
    process.exit(0);
}

createTestAdmin().catch((err) => {
    console.error("Error creating admin:", err);
    process.exit(1);
});
