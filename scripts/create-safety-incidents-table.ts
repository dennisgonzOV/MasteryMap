
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function createSafetyIncidentsTable() {
  try {
    console.log("Creating safety_incidents table...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS safety_incidents (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        teacher_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
        component_skill_id INTEGER REFERENCES component_skills(id) ON DELETE CASCADE,
        incident_type VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        conversation_history JSONB,
        severity VARCHAR(20) DEFAULT 'medium',
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP,
        resolved_by INTEGER REFERENCES users(id)
      );
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_safety_incidents_student_id ON safety_incidents(student_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_safety_incidents_incident_type ON safety_incidents(incident_type);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity ON safety_incidents(severity);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_safety_incidents_resolved ON safety_incidents(resolved);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_safety_incidents_created_at ON safety_incidents(created_at);
    `);

    console.log("Safety incidents table created successfully!");
    
  } catch (error) {
    console.error("Error creating safety incidents table:", error);
    process.exit(1);
  }
}

createSafetyIncidentsTable();
