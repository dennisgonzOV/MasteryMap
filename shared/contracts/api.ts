import type {
  Assessment,
  BestStandard,
  Credential,
  Milestone,
  Notification,
  PortfolioArtifact,
  Project,
  Submission,
  User,
} from "../schema";

export type AuthUserDTO = Omit<User, "password">;
export type ProjectDTO = Project;
export type MilestoneDTO = Milestone;
export type AssessmentDTO = Assessment;
export type SubmissionDTO = Submission;
export type CredentialDTO = Credential;
export type BestStandardDTO = BestStandard;
export type PortfolioArtifactDTO = PortfolioArtifact;
export interface PortfolioSettingsDTO {
  id: number;
  studentId: number | null;
  title: string;
  description: string | null;
  publicUrl: string;
  isPublic: boolean | null;
  updatedAt: Date | string | null;
}

export interface PortfolioShareLinkDTO {
  portfolioUrl: string;
  publicUrl: string;
  expiresAt: Date | string | null;
  expirationDays: number | null;
  qrCodeUrl?: string;
}
export type NotificationDTO = Omit<Notification, "metadata"> & {
  metadata?: NotificationMetadataDTO | null;
};

export interface NotificationMetadataDTO {
  projectId?: number;
  assessmentId?: number;
  submissionId?: number;
  [key: string]: unknown;
}

export interface AssessmentSubmissionGradeDTO {
  id: number;
  submissionId: number;
  componentSkillId: number | null;
  rubricLevel: string | null;
  score: string | number | null;
  feedback: string | null;
  gradedBy: number | null;
  gradedAt: Date | string | null;
  componentSkillName?: string | null;
  competencyName?: string | null;
}

export interface AssessmentSubmissionSummaryDTO {
  id: number;
  studentId: number | null;
  studentName: string;
  studentUsername: string;
  responses?: unknown;
  feedback?: string | null;
  aiGeneratedFeedback?: boolean | null;
  submittedAt?: Date | string | null;
  gradedAt?: Date | string | null;
  grade?: string | number | null;
  grades?: AssessmentSubmissionGradeDTO[];
  assessmentId?: number;
}

export interface StudentAssessmentQuestionDTO {
  id: string | number;
  text: string;
  type?: "open-ended" | "multiple-choice" | "short-answer" | string;
  options?: string[] | string;
  rubricCriteria?: string | null;
  [key: string]: unknown;
}

export interface HierarchyComponentSkillDTO {
  id: number;
  name: string;
}

export interface HierarchyCompetencyDTO {
  id: number;
  name: string;
  componentSkills?: HierarchyComponentSkillDTO[];
}

export interface StudentAssessmentResponseDTO {
  questionId: string | number;
  answer: string;
}

export interface StudentAssessmentSubmissionDTO {
  id: number;
  assessmentId?: number | null;
  assessmentTitle: string;
  assessmentDescription?: string | null;
  projectTitle?: string | null;
  milestoneTitle?: string | null;
  questions?: StudentAssessmentQuestionDTO[] | null;
  responses?: Record<string, string> | StudentAssessmentResponseDTO[] | null;
  submittedAt?: Date | string | null;
  feedback?: string | null;
  status?: "graded" | "submitted" | "draft";
  earnedCredentials?: CredentialDTO[];
  questionGrades?: Record<string, { score: number; rubricLevel?: string | null; feedback?: string | null }>;
  grades?: AssessmentSubmissionGradeDTO[];
}

export interface SubmissionWithAssessmentDTO extends SubmissionDTO {
  assessment?: AssessmentDTO | null;
  grades?: AssessmentSubmissionGradeDTO[];
  earnedCredentials?: CredentialDTO[];
  status?: "graded" | "submitted" | "draft";
}

export interface ComponentSkillWithDetailsDTO {
  id: number;
  name: string;
  competencyId: number | null;
  competencyName?: string | null;
  competencyDescription?: string | null;
  competencyCategory?: string | null;
  learnerOutcomeName?: string | null;
  learnerOutcomeType?: string | null;
  rubricLevels?: unknown;
  [key: string]: unknown;
}

export interface StudentSummaryDTO {
  id: number;
  username: string;
}

export interface StudentSchoolProgressDTO extends StudentSummaryDTO {
  grade?: string | null;
  projects: Array<{
    projectId: number | null;
    projectTitle: string | null;
    projectDescription: string | null;
    projectStatus: string | null;
    teacherName: string | null;
  }>;
  credentials: CredentialDTO[];
  competencyProgress: Array<{
    competencyId: number;
    competencyName: string;
    componentSkillId: number | null;
    componentSkillName: string;
    averageScore: number;
    submissionCount: number;
  }>;
  totalCredentials: number;
  stickers: number;
  badges: number;
  plaques: number;
}

export interface TeacherDashboardStatsDTO {
  activeProjects: number;
  totalStudents: number;
  pendingGrades: number;
  credentialsAwarded: number;
  upcomingDeadlines: number;
}

export interface TeacherProjectOverviewDTO {
  id: number;
  title: string;
  description: string | null;
  studentsAssigned: number;
  completionRate: number;
  nextDeadline: string | Date | null;
  status: "active" | "planning" | "completed" | "draft" | "archived" | string | null;
}

export interface TeacherPendingTaskDTO {
  id: number;
  type: "grading" | "feedback" | "milestone-review" | "credential-approval" | string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low" | string;
  dueDate: string | Date;
  studentName?: string;
  projectTitle?: string;
}

export interface TeacherCurrentMilestoneDTO {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | Date | null;
  status: "not_started" | "in_progress" | "completed" | string;
  progress: number;
}

export interface LearnerOutcomeHierarchyItemDTO {
  id: number;
  name: string;
  competencies?: HierarchyCompetencyDTO[];
}

export interface ProjectTeamDTO {
  id: number;
  projectId: number | null;
  name: string;
  description: string | null;
  createdAt: Date | string | null;
}

export interface ProjectTeamMemberDTO {
  id: number;
  teamId: number;
  studentId: number;
  role?: string | null;
  joinedAt?: Date | string | null;
  studentName?: string | null;
  student?: StudentSummaryDTO;
}

export interface AuthLoginRequestDTO {
  username: string;
  password: string;
}

export interface AuthRegisterRequestDTO {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  role?: AuthUserDTO["role"];
  schoolId?: number;
}

export type AuthRegisterResponseDTO = AuthUserDTO;
export type AuthLoginResponseDTO = AuthUserDTO;
export type AuthCurrentUserResponseDTO = AuthUserDTO;

export interface ProjectCreateRequestDTO {
  title: string;
  description?: string | null;
  componentSkillIds?: number[];
  bestStandardIds?: number[];
  dueDate?: string | Date | null;
  isPublic?: boolean;
  subjectArea?: string | null;
  gradeLevel?: string | null;
  estimatedDuration?: string | null;
  thumbnailUrl?: string | null;
}

export type ProjectUpdateRequestDTO = Partial<ProjectCreateRequestDTO>;

export interface AssessmentQuestionDTO {
  text: string;
  type?: "open-ended" | "multiple-choice" | "short-answer" | string;
  rubricCriteria?: string;
  [key: string]: unknown;
}

export interface AIAssessmentGenerationRequestDTO {
  milestoneTitle: string;
  milestoneDescription: string;
  milestoneDueDate: string;
  componentSkills: ComponentSkillWithDetailsDTO[];
  bestStandards?: BestStandardDTO[];
  questionCount?: number;
  questionTypes?: string[];
  pdfUrl?: string;
}

export interface AIAssessmentGeneratedQuestionDTO {
  id?: string;
  text: string;
  type: "open-ended" | "multiple-choice" | "short-answer";
  rubricCriteria?: string;
  sampleAnswer?: string;
  choices?: string[];
  correctAnswer?: string;
}

export interface AIAssessmentGenerationResponseDTO {
  title: string;
  description: string;
  questions: AIAssessmentGeneratedQuestionDTO[];
}

export interface FileUploadResponseDTO {
  objectPath: string;
}

export interface AssessmentCreateRequestDTO {
  milestoneId?: number | null;
  title: string;
  description?: string | null;
  questions?: AssessmentQuestionDTO[] | null;
  rubricId?: number | null;
  componentSkillIds?: number[];
  dueDate?: string | Date | null;
  aiGenerated?: boolean;
  assessmentType?: "teacher" | "self-evaluation";
  allowSelfEvaluation?: boolean;
  shareCode?: string | null;
  shareCodeExpiresAt?: string | Date | null;
  pdfUrl?: string | null;
  createdBy?: number | null;
}

export type AssessmentUpdateRequestDTO = Partial<AssessmentCreateRequestDTO>;

export interface SubmissionCreateRequestDTO {
  assessmentId: number;
  responses?: unknown;
  artifacts?: unknown;
  isSelfEvaluation?: boolean;
  selfEvaluationData?: unknown;
}

export interface SubmissionGradeItemDTO {
  componentSkillId: number;
  rubricLevel?: string | null;
  score?: string | number | null;
  feedback?: string | null;
}

export interface SubmissionGradeRequestDTO {
  grades?: SubmissionGradeItemDTO[];
  feedback?: string | null;
  grade?: string | number | null;
  generateAiFeedback?: boolean;
}

export interface ApiMessageResponse {
  message: string;
}

export interface ApiErrorPayload {
  message?: string;
  error?: string;
  details?: unknown;
  errors?: unknown;
  statusCode?: number;
  [key: string]: unknown;
}
