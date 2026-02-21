import 'dotenv/config';
import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("Dropping and recreating public schema...");
    await db.execute(sql`DROP SCHEMA public CASCADE;`);
    await db.execute(sql`CREATE SCHEMA public;`);
    console.log("Schema reset complete.");
    process.exit(0);
}

main().catch(err => {
    console.error("Error resetting schema:", err);
    process.exit(1);
});
