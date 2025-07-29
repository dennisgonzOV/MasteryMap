// Projects domain types
import { z } from 'zod';

// Project creation request schema
export const CreateProjectRequestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  dueDate: z.string().optional(),
  componentSkillIds: z.array(z.number()).min(1, "At least one component skill is required"),
  generateMilestones: z.boolean().optional()
});

// Milestone generation request
export const GenerateMilestonesRequestSchema = z.object({
  projectId: z.number(),
  componentSkillIds: z.array(z.number())
});

// Student assignment request
export const AssignStudentsRequestSchema = z.object({
  studentIds: z.array(z.number()).min(1, "At least one student is required")
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type GenerateMilestonesRequest = z.infer<typeof GenerateMilestonesRequestSchema>;
export type AssignStudentsRequest = z.infer<typeof AssignStudentsRequestSchema>;

// Project with additional data for responses
export interface ProjectWithDetails {
  id: number;
  title: string;
  description: string;
  teacherId: number;
  schoolId: number | null;
  dueDate: Date | null;
  componentSkillIds: number[] | null;
  createdAt: Date;
  teacherName?: string;
  schoolName?: string;
  milestoneCount?: number;
  assignedStudentCount?: number;
}