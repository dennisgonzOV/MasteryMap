import type {
  AIAssessmentGenerationRequestDTO,
  AIAssessmentGenerationResponseDTO,
  AssessmentSubmissionSummaryDTO,
  BestStandardDTO,
  AssessmentCreateRequestDTO,
  ApiMessageResponse,
  AssessmentDTO,
  AssessmentUpdateRequestDTO,
  AuthCurrentUserResponseDTO,
  ComponentSkillWithDetailsDTO,
  CredentialDTO,
  LearnerOutcomeHierarchyItemDTO,
  MilestoneDTO,
  NotificationDTO,
  PortfolioArtifactDTO,
  PortfolioSettingsDTO,
  PortfolioShareLinkDTO,
  ProjectCreateRequestDTO,
  ProjectTeamDTO,
  ProjectTeamMemberDTO,
  ProjectUpdateRequestDTO,
  ProjectDTO,
  ProjectIdeaMilestoneDTO,
  StudentAssessmentSubmissionDTO,
  StudentSchoolProgressDTO,
  StudentSummaryDTO,
  SubmissionCreateRequestDTO,
  SubmissionFeedbackPreviewRequestDTO,
  SubmissionFeedbackPreviewResponseDTO,
  SubmissionGradeRequestDTO,
  SubmissionDTO,
  SubmissionWithAssessmentDTO,
  TeacherCurrentMilestoneDTO,
  TeacherDashboardStatsDTO,
  TeacherPendingTaskDTO,
  TeacherProjectOverviewDTO,
  FileUploadResponseDTO,
} from "@shared/contracts/api";
import { apiJsonRequest } from "./queryClient";
import { apiUploadFile } from "./apiHelpers";

type UnknownRecord = Record<string, unknown>;
type TeacherContentScope = "mine" | "school";

function normalizeScope(scope: unknown): TeacherContentScope {
  return scope === "school" ? "school" : "mine";
}

function withScope(path: string, scope: unknown): string {
  const normalizedScope = normalizeScope(scope);
  return `${path}?scope=${normalizedScope}`;
}

export const api = {
  // Student assessment submissions
  getStudentAssessmentSubmissions: (studentId: number) =>
    apiJsonRequest<StudentAssessmentSubmissionDTO[]>(`/api/student/assessment-submissions/${studentId}`, "GET"),

  // Auth endpoints
  getCurrentUser: () => apiJsonRequest<AuthCurrentUserResponseDTO>("/api/auth/user", "GET"),

  // Projects
  getProjects: (...args: unknown[]) =>
    apiJsonRequest<ProjectDTO[]>(withScope("/api/projects", args[0]), "GET"),
  createProject: (data: ProjectCreateRequestDTO) =>
    apiJsonRequest<ProjectDTO>("/api/projects", "POST", data),
  updateProject: (id: number, data: ProjectUpdateRequestDTO) =>
    apiJsonRequest<ProjectDTO>(`/api/projects/${id}`, "PUT", data),
  deleteProject: (id: number) =>
    apiJsonRequest<ApiMessageResponse>(`/api/projects/${id}`, "DELETE"),
  getProject: (id: number) => apiJsonRequest<ProjectDTO>(`/api/projects/${id}`, "GET"),
  toggleProjectVisibility: (id: number, isPublic: boolean) =>
    apiJsonRequest<ProjectDTO>(`/api/projects/${id}/visibility`, "PATCH", { isPublic }),
  startProject: (id: number) =>
    apiJsonRequest<ApiMessageResponse>(`/api/projects/${id}/start`, "POST"),
  generateMilestones: (projectId: number) =>
    apiJsonRequest<MilestoneDTO[]>(`/api/projects/${projectId}/generate-milestones`, "POST"),
  seedMilestonesFromIdea: (projectId: number, suggestedMilestones: ProjectIdeaMilestoneDTO[]) =>
    apiJsonRequest<{ milestones: MilestoneDTO[]; message: string }>(
      `/api/projects/${projectId}/seed-milestones-from-idea`,
      "POST",
      { suggestedMilestones },
    ),
  generateMilestonesAndAssessments: (projectId: number) =>
    apiJsonRequest<{
      milestones: MilestoneDTO[];
      assessments: AssessmentDTO[];
      message: string;
    }>(`/api/projects/${projectId}/generate-milestones-and-assessments`, "POST"),
  getProjectTeams: (projectId: number) =>
    apiJsonRequest<ProjectTeamDTO[]>(`/api/projects/${projectId}/teams`, "GET"),
  createProjectTeam: (data: { projectId: number; name: string; description?: string }) =>
    apiJsonRequest<ProjectTeamDTO>("/api/project-teams", "POST", data),
  assignStudents: (projectId: number, studentIds: string[]) =>
    apiJsonRequest<ApiMessageResponse>(`/api/projects/${projectId}/assign`, "POST", { studentIds }),

  // Milestones
  getMilestones: (projectId: number) =>
    apiJsonRequest<MilestoneDTO[]>(`/api/projects/${projectId}/milestones`, "GET"),
  getMilestone: (id: number) =>
    apiJsonRequest<MilestoneDTO>(`/api/milestones/${id}`, "GET"),
  updateMilestone: (id: number, data: UnknownRecord) =>
    apiJsonRequest<MilestoneDTO>(`/api/milestones/${id}`, "PUT", data),
  updateMilestoneDeliverable: (
    id: number,
    data: {
      deliverableId?: number;
      deliverableUrl: string;
      deliverableFileName: string;
      deliverableDescription: string;
      includeInPortfolio: boolean;
    },
  ) => apiJsonRequest<MilestoneDTO>(`/api/milestones/${id}/deliverable`, "PATCH", data),
  deleteMilestone: (id: number) =>
    apiJsonRequest<ApiMessageResponse>(`/api/milestones/${id}`, "DELETE"),
  createMilestone: (data: UnknownRecord) =>
    apiJsonRequest<MilestoneDTO>("/api/milestones", "POST", data),
  deleteProjectTeam: (id: number) =>
    apiJsonRequest<ApiMessageResponse>(`/api/project-teams/${id}`, "DELETE"),
  getProjectTeamMembers: (teamId: number) =>
    apiJsonRequest<ProjectTeamMemberDTO[]>(`/api/project-teams/${teamId}/members`, "GET"),
  createProjectTeamMember: (data: { teamId: number; studentId: number; role?: string }) =>
    apiJsonRequest<ProjectTeamMemberDTO>("/api/project-team-members", "POST", data),
  deleteProjectTeamMember: (id: number) =>
    apiJsonRequest<ApiMessageResponse>(`/api/project-team-members/${id}`, "DELETE"),

  // Assessments
  getAllAssessments: (...args: unknown[]) =>
    apiJsonRequest<AssessmentDTO[]>(withScope("/api/assessments", args[0]), "GET"),
  getAssessments: (milestoneId: number) =>
    apiJsonRequest<AssessmentDTO[]>(`/api/milestones/${milestoneId}/assessments`, "GET"),
  getAssessment: (assessmentId: number) =>
    apiJsonRequest<AssessmentDTO>(`/api/assessments/${assessmentId}`, "GET"),
  getStandaloneAssessments: () =>
    apiJsonRequest<AssessmentDTO[]>("/api/assessments/standalone", "GET"),
  createAssessment: (data: AssessmentCreateRequestDTO) =>
    apiJsonRequest<AssessmentDTO>("/api/assessments", "POST", data),
  updateAssessment: (id: number, data: AssessmentUpdateRequestDTO) =>
    apiJsonRequest<AssessmentDTO>(`/api/assessments/${id}`, "PATCH", data),
  generateAssessment: (milestoneId: number) =>
    apiJsonRequest<AssessmentDTO>(`/api/milestones/${milestoneId}/generate-assessment`, "POST"),
  generateAssessmentFromSkills: (data: AIAssessmentGenerationRequestDTO) =>
    apiJsonRequest<AIAssessmentGenerationResponseDTO>("/api/ai/generate-assessment", "POST", data),
  deleteAssessment: (assessmentId: number) =>
    apiJsonRequest<ApiMessageResponse>(`/api/assessments/${assessmentId}`, "DELETE"),
  uploadFile: (file: File) =>
    apiUploadFile("/api/uploads/file", file) as Promise<FileUploadResponseDTO>,

  // Submissions
  createSubmission: (data: SubmissionCreateRequestDTO) =>
    apiJsonRequest<SubmissionDTO>("/api/submissions", "POST", data),
  previewSubmissionFeedback: (data: SubmissionFeedbackPreviewRequestDTO) =>
    apiJsonRequest<SubmissionFeedbackPreviewResponseDTO>("/api/submissions/preview-feedback", "POST", data),
  getStudentSubmissions: () =>
    apiJsonRequest<SubmissionWithAssessmentDTO[]>("/api/submissions/student", "GET"),
  getAssessmentSubmissions: (assessmentId: number) =>
    apiJsonRequest<AssessmentSubmissionSummaryDTO[]>(`/api/assessments/${assessmentId}/submissions`, "GET"),
  gradeSubmission: (submissionId: number, data: SubmissionGradeRequestDTO) =>
    apiJsonRequest<ApiMessageResponse>(`/api/submissions/${submissionId}/grade`, "POST", data),

  // Credentials
  getStudentCredentials: () =>
    apiJsonRequest<CredentialDTO[]>("/api/credentials/student", "GET"),
  getTeacherCredentialStats: () =>
    apiJsonRequest<CredentialDTO[]>("/api/credentials/teacher-stats", "GET"),
  getStudentCredentialsByStudentId: (studentId: number) =>
    apiJsonRequest<CredentialDTO[]>(`/api/credentials/student?studentId=${studentId}`, "GET"),
  awardCredential: (data: UnknownRecord) =>
    apiJsonRequest<CredentialDTO>("/api/credentials", "POST", data),

  // Portfolio
  getPortfolioArtifacts: () =>
    apiJsonRequest<PortfolioArtifactDTO[]>("/api/portfolio/artifacts", "GET"),
  getPortfolioArtifactsByStudent: (studentId: number) =>
    apiJsonRequest<PortfolioArtifactDTO[]>(`/api/portfolio/artifacts?studentId=${studentId}`, "GET"),
  createPortfolioArtifact: (data: UnknownRecord) =>
    apiJsonRequest<PortfolioArtifactDTO>("/api/portfolio/artifacts", "POST", data),
  updatePortfolioArtifact: (artifactId: number, data: UnknownRecord) =>
    apiJsonRequest<PortfolioArtifactDTO>(`/api/portfolio/artifacts/${artifactId}`, "PATCH", data),
  updatePortfolioArtifactVisibility: (artifactId: number, isPublic: boolean) =>
    apiJsonRequest<PortfolioArtifactDTO>(`/api/portfolio/artifacts/${artifactId}/visibility`, "PATCH", { isPublic }),
  getPortfolioSettings: () =>
    apiJsonRequest<PortfolioSettingsDTO>("/api/portfolio/settings", "GET"),
  updatePortfolioSettings: (data: { title?: string; description?: string | null }) =>
    apiJsonRequest<PortfolioSettingsDTO>("/api/portfolio/settings", "PATCH", data),
  getPortfolioShareLink: (expirationDays?: number) =>
    apiJsonRequest<PortfolioShareLinkDTO>(
      expirationDays
        ? `/api/portfolio/share-link?expirationDays=${expirationDays}`
        : "/api/portfolio/share-link",
      "GET",
    ),
  getPortfolioShareQrCode: (expirationDays?: number) =>
    apiJsonRequest<PortfolioShareLinkDTO>(
      expirationDays
        ? `/api/portfolio/qr-code?expirationDays=${expirationDays}`
        : "/api/portfolio/qr-code",
      "GET",
    ),

  // Competencies
  getCompetencies: () => apiJsonRequest<UnknownRecord[]>("/api/competencies", "GET"),
  getComponentSkills: () =>
    apiJsonRequest<ComponentSkillWithDetailsDTO[]>("/api/competencies/component-skills", "GET"),
  getComponentSkillsWithDetails: () =>
    apiJsonRequest<ComponentSkillWithDetailsDTO[]>("/api/competencies/component-skills/details", "GET"),
  getComponentSkillsByIds: (skillIds: number[]) =>
    apiJsonRequest<ComponentSkillWithDetailsDTO[]>("/api/competencies/component-skills/by-ids", "POST", { skillIds }),
  getBestStandardsByIds: (standardIds: number[]) =>
    apiJsonRequest<BestStandardDTO[]>("/api/competencies/best-standards/by-ids", "POST", { standardIds }),
  getOutcomes: (competencyId: number) =>
    apiJsonRequest<UnknownRecord[]>(`/api/competencies/${competencyId}/outcomes`, "GET"),
  getLearnerOutcomes: () =>
    apiJsonRequest<UnknownRecord[]>("/api/learner-outcomes", "GET"),
  getLearnerOutcomesHierarchyComplete: () =>
    apiJsonRequest<LearnerOutcomeHierarchyItemDTO[]>("/api/competencies/learner-outcomes-hierarchy/complete", "GET"),

  // Notifications
  getNotifications: () =>
    apiJsonRequest<NotificationDTO[]>("/api/notifications", "GET"),
  markNotificationAsRead: (notificationId: number) =>
    apiJsonRequest<ApiMessageResponse>(`/api/notifications/${notificationId}/mark-read`, "POST"),
  markAllNotificationsAsRead: () =>
    apiJsonRequest<ApiMessageResponse>("/api/notifications/mark-all-read", "POST"),

  // Dashboard endpoints
  getTeacherDashboardStats: () =>
    apiJsonRequest<TeacherDashboardStatsDTO>("/api/teacher/dashboard-stats", "GET"),
  getTeacherProjects: () =>
    apiJsonRequest<TeacherProjectOverviewDTO[]>("/api/teacher/projects", "GET"),
  getTeacherPendingTasks: () =>
    apiJsonRequest<TeacherPendingTaskDTO[]>("/api/teacher/pending-tasks", "GET"),
  getTeacherCurrentMilestones: () =>
    apiJsonRequest<TeacherCurrentMilestoneDTO[]>("/api/teacher/current-milestones", "GET"),
  getStudentDeadlines: () =>
    apiJsonRequest<UnknownRecord[]>("/api/deadlines/student", "GET"),
  getSchoolStudentsProgress: () =>
    apiJsonRequest<StudentSchoolProgressDTO[]>("/api/schools/students-progress", "GET"),
  getSchoolStudents: (schoolId: number) =>
    apiJsonRequest<StudentSummaryDTO[]>(`/api/schools/${schoolId}/students`, "GET"),
};
