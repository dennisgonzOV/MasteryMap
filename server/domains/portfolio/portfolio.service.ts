import { randomBytes } from "crypto";
import { portfolioStorage, type IPortfolioStorage } from "./portfolio.storage";
import {
  type PortfolioArtifact,
  type InsertPortfolioArtifact,
  type InsertPortfolio,
  type Portfolio,
  type Credential,
  type User,
} from "../../../shared/schema";

export interface PublicPortfolioData {
  student: {
    id: number;
    username: string;
    profileImageUrl: string | null;
    firstName: string | null;
    lastName: string | null;
    schoolName: string | null;
    grade: string | null;
  };
  portfolio: {
    title: string;
    description: string | null;
    publicUrl: string;
    updatedAt: Date | null;
  };
  verification: {
    verifiedCredentialCount: number;
    totalCredentialCount: number;
    lastVerifiedAt: Date | null;
  };
  lastActivityAt: Date | null;
  artifacts: PortfolioArtifact[];
  credentials: Credential[];
}

export interface StudentPortfolioSettings {
  id: number;
  studentId: number | null;
  title: string;
  description: string | null;
  publicUrl: string;
  isPublic: boolean | null;
  updatedAt: Date | null;
}

export interface IPortfolioService {
  getStudentArtifacts(studentId: number): Promise<PortfolioArtifact[]>;
  createArtifact(artifactData: InsertPortfolioArtifact): Promise<PortfolioArtifact>;
  updateArtifactForStudent(
    studentId: number,
    artifactId: number,
    updates: Partial<InsertPortfolioArtifact>,
  ): Promise<PortfolioArtifact>;
  getStudentPortfolioSettings(studentId: number): Promise<StudentPortfolioSettings>;
  updateStudentPortfolioSettings(
    studentId: number,
    updates: { isPublic?: boolean; title?: string; description?: string | null },
  ): Promise<StudentPortfolioSettings>;
  getOrCreateShareSlug(studentId: number): Promise<string>;
  getPublicPortfolioByUrl(publicUrl: string): Promise<PublicPortfolioData | null>;
  getPublicPortfolio(studentId: number): Promise<PublicPortfolioData | null>;
}

export class PortfolioService implements IPortfolioService {
  constructor(private storage: IPortfolioStorage = portfolioStorage) {}

  async getStudentArtifacts(studentId: number): Promise<PortfolioArtifact[]> {
    return this.storage.getPortfolioArtifactsByStudent(studentId);
  }

  async createArtifact(artifactData: InsertPortfolioArtifact): Promise<PortfolioArtifact> {
    return this.storage.createPortfolioArtifact(artifactData);
  }

  async updateArtifactForStudent(
    studentId: number,
    artifactId: number,
    updates: Partial<InsertPortfolioArtifact>,
  ): Promise<PortfolioArtifact> {
    const artifact = await this.storage.getPortfolioArtifactById(artifactId);
    if (!artifact || artifact.studentId !== studentId) {
      throw new Error("Artifact not found");
    }

    const sanitizedUpdates: Partial<InsertPortfolioArtifact> = { ...updates };

    // Milestone-driven artifacts keep milestone title/description as source of truth.
    if (artifact.milestoneId != null) {
      delete sanitizedUpdates.title;
      delete sanitizedUpdates.description;
    }

    return this.storage.updatePortfolioArtifact(artifactId, sanitizedUpdates);
  }

  async getStudentPortfolioSettings(studentId: number): Promise<StudentPortfolioSettings> {
    const student = await this.storage.getStudentById(studentId);
    if (!student || student.role !== "student") {
      throw new Error("Student not found");
    }

    const portfolio = await this.ensurePortfolio(student);
    return this.toSettingsResponse(portfolio);
  }

  async updateStudentPortfolioSettings(
    studentId: number,
    updates: { isPublic?: boolean; title?: string; description?: string | null },
  ): Promise<StudentPortfolioSettings> {
    const student = await this.storage.getStudentById(studentId);
    if (!student || student.role !== "student") {
      throw new Error("Student not found");
    }

    const portfolio = await this.ensurePortfolio(student);
    const updatedPortfolio = await this.storage.updatePortfolio(portfolio.id, updates);
    return this.toSettingsResponse(updatedPortfolio);
  }

  async getOrCreateShareSlug(studentId: number): Promise<string> {
    const student = await this.storage.getStudentById(studentId);
    if (!student || student.role !== "student") {
      throw new Error("Student not found");
    }

    const portfolio = await this.ensurePortfolio(student);
    return portfolio.publicUrl ?? "";
  }

  async getPublicPortfolioByUrl(publicUrl: string): Promise<PublicPortfolioData | null> {
    const portfolio = await this.storage.getPortfolioByPublicUrl(publicUrl);
    if (!portfolio || portfolio.isPublic !== true || !portfolio.studentId) {
      return null;
    }

    const student = await this.storage.getStudentById(portfolio.studentId);
    if (!student || student.role !== "student") {
      return null;
    }

    return this.buildPublicPortfolioResponse(student, portfolio);
  }

  async getPublicPortfolio(studentId: number): Promise<PublicPortfolioData | null> {
    const student = await this.storage.getStudentById(studentId);
    if (!student || student.role !== "student") {
      return null;
    }

    const portfolio = await this.ensurePortfolio(student);
    if (portfolio.isPublic !== true) {
      return null;
    }

    return this.buildPublicPortfolioResponse(student, portfolio);
  }

  private async buildPublicPortfolioResponse(student: User, portfolio: Portfolio): Promise<PublicPortfolioData> {
    const [artifacts, credentials] = await Promise.all([
      this.storage.getPublicArtifactsByStudent(student.id),
      this.storage.getCredentialsByStudent(student.id),
    ]);

    const verifiedCredentials = credentials.filter((credential) => credential.approvedBy !== null);

    const lastVerifiedAt = verifiedCredentials
      .map((credential) => credential.awardedAt)
      .filter((awardedAt): awardedAt is Date => Boolean(awardedAt))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    const latestArtifactDate = artifacts
      .map((artifact) => artifact.createdAt)
      .filter((createdAt): createdAt is Date => Boolean(createdAt))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    const latestCredentialDate = credentials
      .map((credential) => credential.awardedAt)
      .filter((awardedAt): awardedAt is Date => Boolean(awardedAt))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    const lastActivityAt = [portfolio.updatedAt, latestArtifactDate, latestCredentialDate]
      .filter((timestamp): timestamp is Date => Boolean(timestamp))
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      student: {
        id: student.id,
        username: student.username,
        profileImageUrl: student.profileImageUrl,
        firstName: student.firstName ?? null,
        lastName: student.lastName ?? null,
        schoolName: student.schoolName ?? null,
        grade: student.grade ?? null,
      },
      portfolio: {
        title: portfolio.title,
        description: portfolio.description ?? null,
        publicUrl: portfolio.publicUrl ?? "",
        updatedAt: portfolio.updatedAt ?? null,
      },
      verification: {
        verifiedCredentialCount: verifiedCredentials.length,
        totalCredentialCount: credentials.length,
        lastVerifiedAt,
      },
      lastActivityAt,
      artifacts,
      credentials,
    };
  }

  private async ensurePortfolio(student: User): Promise<Portfolio> {
    const existingPortfolio = await this.storage.getPortfolioByStudent(student.id);
    if (existingPortfolio) {
      return existingPortfolio;
    }

    const titleBase = student.firstName?.trim() || student.username;
    const portfolioData: InsertPortfolio = {
      studentId: student.id,
      title: `${titleBase}'s Portfolio`,
      description: "Portfolio of project-based learning work and credentials.",
      publicUrl: await this.generateUniquePublicUrl(),
      isPublic: true,
    };

    return this.storage.createPortfolio(portfolioData);
  }

  private toSettingsResponse(portfolio: Portfolio): StudentPortfolioSettings {
    return {
      id: portfolio.id,
      studentId: portfolio.studentId ?? null,
      title: portfolio.title,
      description: portfolio.description ?? null,
      publicUrl: portfolio.publicUrl ?? "",
      isPublic: portfolio.isPublic ?? false,
      updatedAt: portfolio.updatedAt ?? null,
    };
  }

  private async generateUniquePublicUrl(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const candidate = `p-${randomBytes(8).toString("hex")}`;
      const existing = await this.storage.getPortfolioByPublicUrl(candidate);
      if (!existing) {
        return candidate;
      }
    }

    throw new Error("Failed to generate unique portfolio URL");
  }
}

export const portfolioService = new PortfolioService();
