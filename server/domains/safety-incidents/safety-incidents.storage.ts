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
  updateSafetyIncidentStatus(incidentId: number, status: string): Promise<void>;
  resolveSafetyIncident(incidentId: number, userId: number): Promise<void>;
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

  async updateSafetyIncidentStatus(incidentId: number, status: string): Promise<void> {
    const isResolved = status === "resolved" || status === "closed";
    await db
      .update(safetyIncidents)
      .set({ 
        resolved: isResolved,
        resolvedAt: isResolved ? new Date() : null,
      })
      .where(eq(safetyIncidents.id, incidentId));
  }

  async resolveSafetyIncident(incidentId: number, userId: number): Promise<void> {
    await db
      .update(safetyIncidents)
      .set({
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
      })
      .where(eq(safetyIncidents.id, incidentId));
  }
}

export const safetyIncidentStorage = new SafetyIncidentStorage();
