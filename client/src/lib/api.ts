import { apiRequest } from "./queryClient";

export const api = {
  // Student assessment submissions
  async getStudentAssessmentSubmissions(studentId: number) {
    const response = await apiRequest(`/api/student/assessment-submissions/${studentId}`, 'GET');
    return response.json();
  },

  // Auth endpoints
  getCurrentUser: () => apiRequest("/api/auth/user", "GET").then(res => res.json()),

  // Projects
  getProjects: () => apiRequest("/api/projects", "GET").then(res => res.json()),
  createProject: async (data: any) => {
    const response = await apiRequest("/api/projects", "POST", data);
    return response.json();
  },
  getProject: (id: number) => apiRequest(`/api/projects/${id}`, "GET").then(res => res.json()),
  generateMilestones: async (projectId: number) => {

    const response = await apiRequest(`/api/projects/${projectId}/generate-milestones`, "POST");
    return response.json();
  },
  assignStudents: (projectId: number, studentIds: string[]) =>
    apiRequest(`/api/projects/${projectId}/assign`, "POST", { studentIds }),

  // Milestones
  getMilestones: (projectId: number) =>
    apiRequest(`/api/projects/${projectId}/milestones`, "GET").then(res => res.json()),
  createMilestone: (data: any) => apiRequest("/api/milestones", "POST", data),

  // Assessments
  getAssessments: (milestoneId: number) =>
    apiRequest(`/api/milestones/${milestoneId}/assessments`, "GET").then(res => res.json()),
  getStandaloneAssessments: () =>
    apiRequest("/api/assessments/standalone", "GET").then(res => res.json()),
  createAssessment: (data: any) => apiRequest("/api/assessments", "POST", data),
  updateAssessment: (id: number, data: any) => apiRequest(`/api/assessments/${id}`, "PATCH", data),
  generateAssessment: (milestoneId: number) =>
    apiRequest(`/api/milestones/${milestoneId}/generate-assessment`, "POST"),

  // Submissions
  createSubmission: (data: any) => apiRequest("/api/submissions", "POST", data),
  getStudentSubmissions: () =>
    apiRequest("/api/submissions/student", "GET").then(res => res.json()),
  getAssessmentSubmissions: (assessmentId: number) =>
    apiRequest(`/api/assessments/${assessmentId}/submissions`, "GET").then(res => res.json()),
  // The line below is the updated version of the original getStudentAssessmentSubmissions
  // getStudentAssessmentSubmissions: (studentId: number) => 
  //   fetch(`/api/student/assessment-submissions/${studentId}`, { credentials: "include" }).then(res => res.json()),
  gradeSubmission: (submissionId: number, data: any) =>
    apiRequest(`/api/submissions/${submissionId}/grade`, "POST", data),

  // Credentials
  getStudentCredentials: () =>
    apiRequest("/api/credentials/student", "GET").then(res => res.json()),
  awardCredential: (data: any) => apiRequest("/api/credentials", "POST", data),

  // Portfolio
  getPortfolioArtifacts: () =>
    apiRequest("/api/portfolio/artifacts", "GET").then(res => res.json()),
  createPortfolioArtifact: (data: any) => apiRequest("/api/portfolio/artifacts", "POST", data),

  // Competencies
  getCompetencies: () =>
    apiRequest("/api/competencies", "GET").then(res => res.json()),
  getOutcomes: (competencyId: number) =>
    apiRequest(`/api/competencies/${competencyId}/outcomes`, "GET").then(res => res.json()),
  getLearnerOutcomes: () =>
    apiRequest("/api/learner-outcomes", "GET").then(res => res.json()),

  // Dashboard endpoints
  getTeacherDashboardStats: () =>
    apiRequest("/api/teacher/dashboard-stats", "GET").then(res => res.json()),
  getTeacherProjects: () =>
    apiRequest("/api/teacher/projects", "GET").then(res => res.json()),
  getTeacherPendingTasks: () =>
    apiRequest("/api/teacher/pending-tasks", "GET").then(res => res.json()),
  getTeacherCurrentMilestones: () =>
    apiRequest("/api/teacher/current-milestones", "GET").then(res => res.json()),
  getStudentDeadlines: () =>
    apiRequest("/api/deadlines/student", "GET").then(res => res.json()),
  getSchoolStudentsProgress: () =>
    apiRequest("/api/schools/students-progress", "GET").then(res => res.json()),
};