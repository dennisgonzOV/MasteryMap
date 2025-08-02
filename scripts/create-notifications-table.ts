
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function createNotificationsTable() {
  try {
    console.log("Creating notifications table...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL DEFAULT 'system',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        priority VARCHAR(20) DEFAULT 'medium',
        read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    `);

    console.log("Notifications table created successfully!");
    
  } catch (error) {
    console.error("Error creating notifications table:", error);
    process.exit(1);
  }
}

createNotificationsTable();
