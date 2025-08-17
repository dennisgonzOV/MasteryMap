
import { db } from "../server/db";
import { users } from "../shared/schema";
import { sql } from "drizzle-orm";

async function migrateToUsername() {
  try {
    console.log("Starting migration to username authentication...");
    
    // Add username column if it doesn't exist
    console.log("Adding username column...");
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS username VARCHAR(255);
    `);

    // Update existing users to have usernames based on email prefix
    console.log("Updating existing users with usernames...");
    await db.execute(sql`
      UPDATE users 
      SET username = SPLIT_PART(email, '@', 1) 
      WHERE username IS NULL;
    `);

    // Make username NOT NULL and UNIQUE
    console.log("Making username column NOT NULL and UNIQUE...");
    await db.execute(sql`
      ALTER TABLE users 
      ALTER COLUMN username SET NOT NULL;
    `);
    
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_key ON users(username);
    `);

    // Make email column nullable since we're switching to username
    console.log("Making email column nullable...");
    await db.execute(sql`
      ALTER TABLE users 
      ALTER COLUMN email DROP NOT NULL;
    `);

    console.log("Migration completed successfully!");
    console.log("Users now authenticate with username instead of email.");
    
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrateToUsername().then(() => {
  console.log("Migration script completed");
  process.exit(0);
});
