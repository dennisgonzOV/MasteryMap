import { safetyIncidentStorage, type ISafetyIncidentStorage } from './safety-incidents.storage';
import { 
  type SafetyIncident,
  type SafetyIncident as InsertSafetyIncident
} from "../../../shared/schema";

export interface ISafetyIncidentService {
  getAllSafetyIncidents(): Promise<SafetyIncident[]>;
  createSafetyIncident(incident: InsertSafetyIncident): Promise<SafetyIncident>;
  updateSafetyIncidentStatus(incidentId: number, status: string): Promise<void>;
  resolveSafetyIncident(incidentId: number, userId: number): Promise<void>;
}

export class SafetyIncidentService implements ISafetyIncidentService {
  constructor(private storage: ISafetyIncidentStorage = safetyIncidentStorage) {}

  async getAllSafetyIncidents(): Promise<SafetyIncident[]> {
    return await this.storage.getSafetyIncidents();
  }

  async createSafetyIncident(incident: InsertSafetyIncident): Promise<SafetyIncident> {
    return await this.storage.createSafetyIncident(incident);
  }

  async updateSafetyIncidentStatus(incidentId: number, status: string): Promise<void> {
    if (!['open', 'investigating', 'resolved', 'closed'].includes(status)) {
      throw new Error("Invalid status");
    }

    await this.storage.updateSafetyIncidentStatus(incidentId, status);
  }

  async resolveSafetyIncident(incidentId: number, userId: number): Promise<void> {
    await this.storage.resolveSafetyIncident(incidentId, userId);
  }
}

export const safetyIncidentService = new SafetyIncidentService();
