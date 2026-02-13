import type {
  Competency,
  ComponentSkill,
  LearnerOutcome,
  User,
} from "../../../shared/schema";

export type LearnerOutcomeWithCompetencies = LearnerOutcome & {
  competencies: Array<Competency & { componentSkills: ComponentSkill[] }>;
};

export type StudentCompetencyProgressRecord = {
  componentSkillId: number | null;
  componentSkillName: string;
  averageScore: number;
  submissionCount: number;
};

export type SchoolStudentProjectRecord = {
  projectId: number | null;
  projectTitle: string | null;
  projectDescription: string | null;
  projectStatus: string | null;
  teacherName: string | null;
};

export type SchoolStudentCredentialRecord = {
  id: number;
  title: string;
  description: string | null;
  type: string;
  awardedAt: Date | null;
};

export type SchoolStudentCompetencyProgressRecord = {
  competencyId: number;
  competencyName: string;
  componentSkillId: number | null;
  componentSkillName: string;
  averageScore: number;
  submissionCount: number;
};

export type SchoolStudentProgressRecord = User & {
  projects: SchoolStudentProjectRecord[];
  credentials: SchoolStudentCredentialRecord[];
  competencyProgress: SchoolStudentCompetencyProgressRecord[];
  totalCredentials: number;
  stickers: number;
  badges: number;
  plaques: number;
};

export type PublicProjectFilters = {
  search?: string;
  subjectArea?: string;
  gradeLevel?: string;
  estimatedDuration?: string;
  componentSkillIds?: number[];
  bestStandardIds?: number[];
};
