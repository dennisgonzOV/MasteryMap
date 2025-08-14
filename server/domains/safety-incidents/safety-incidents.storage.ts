import { eq, desc } from "drizzle-orm";
import { db } from "../../db";
import { 
  safetyIncidents,
  type SafetyIncident,
  type SafetyIncident as InsertSafetyIncident
} from "../../../shared/schema";

export interface ISafetyIncidentStorage {
  getSafetyIncidents(): Promise<SafetyIncident[]>;
  createSafetyIncident(incident: InsertSafetyIncident): Promise<SafetyIncident>;
  updateSafetyIncidentStatus(incidentId: number, status: string, resolution?: string): Promise<void>;
}

export class SafetyIncidentStorage implements ISafetyIncidentStorage {
  async getSafetyIncidents(): Promise<SafetyIncident[]> {
    return await db
      .select()
      .from(safetyIncidents)
      .orderBy(desc(safetyIncidents.createdAt));
  }

  async createSafetyIncident(incident: InsertSafetyIncident): Promise<SafetyIncident> {
    const [newIncident] = await db
      .insert(safetyIncidents)
      .values(incident)
      .returning();
    return newIncident;
  }

  async updateSafetyIncidentStatus(incidentId: number, status: string, resolution?: string): Promise<void> {
    await db
      .update(safetyIncidents)
      .set({ 
        resolution,
        updatedAt: new Date()
      })
      .where(eq(safetyIncidents.id, incidentId));
  }
}

export const safetyIncidentStorage = new SafetyIncidentStorage();