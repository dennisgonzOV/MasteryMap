import { apiRequest } from "./queryClient";

export const api = {
  // Auth
  getCurrentUser: () => fetch("/api/auth/user", { credentials: "include" }).then(res => res.json()),
  
  // Projects
  getProjects: () => fetch("/api/projects", { credentials: "include" }).then(res => res.json()),
  createProject: async (data: any) => {
    const response = await apiRequest("/api/projects", "POST", data);
    return response.json();
  },
  getProject: (id: number) => fetch(`/api/projects/${id}`, { credentials: "include" }).then(res => res.json()),
  generateMilestones: async (projectId: number) => {
    console.log('API generateMilestones called with projectId:', projectId);
    const response = await apiRequest(`/api/projects/${projectId}/generate-milestones`, "POST");
    return response.json();
  },
  assignStudents: (projectId: number, studentIds: string[]) => 
    apiRequest(`/api/projects/${projectId}/assign`, "POST", { studentIds }),
  
  // Milestones
  getMilestones: (projectId: number) => 
    fetch(`/api/projects/${projectId}/milestones`, { credentials: "include" }).then(res => res.json()),
  createMilestone: (data: any) => apiRequest("/api/milestones", "POST", data),
  
  // Assessments
  getAssessments: (milestoneId: number) => 
    fetch(`/api/milestones/${milestoneId}/assessments`, { credentials: "include" }).then(res => res.json()),
  getStandaloneAssessments: () => 
    fetch("/api/assessments/standalone", { credentials: "include" }).then(res => res.json()),
  createAssessment: (data: any) => apiRequest("/api/assessments", "POST", data),
  generateAssessment: (milestoneId: number) => 
    apiRequest(`/api/milestones/${milestoneId}/generate-assessment`, "POST"),
  
  // Submissions
  createSubmission: (data: any) => apiRequest("/api/submissions", "POST", data),
  getStudentSubmissions: () => 
    fetch("/api/submissions/student", { credentials: "include" }).then(res => res.json()),
  getAssessmentSubmissions: (assessmentId: number) => 
    fetch(`/api/assessments/${assessmentId}/submissions`, { credentials: "include" }).then(res => res.json()),
  gradeSubmission: (submissionId: number, data: any) => 
    apiRequest(`/api/submissions/${submissionId}/grade`, "POST", data),
  
  // Credentials
  getStudentCredentials: () => 
    fetch("/api/credentials/student", { credentials: "include" }).then(res => res.json()),
  awardCredential: (data: any) => apiRequest("/api/credentials", "POST", data),
  
  // Portfolio
  getPortfolioArtifacts: () => 
    fetch("/api/portfolio/artifacts", { credentials: "include" }).then(res => res.json()),
  createPortfolioArtifact: (data: any) => apiRequest("/api/portfolio/artifacts", "POST", data),
  
  // Competencies
  getCompetencies: () => 
    fetch("/api/competencies", { credentials: "include" }).then(res => res.json()),
  getOutcomes: (competencyId: number) => 
    fetch(`/api/competencies/${competencyId}/outcomes`, { credentials: "include" }).then(res => res.json()),
  getLearnerOutcomes: () => 
    fetch("/api/learner-outcomes", { credentials: "include" }).then(res => res.json()),
  
  // Dashboard endpoints
  getTeacherDashboardStats: () =>
    fetch("/api/teacher/dashboard-stats", { credentials: "include" }).then(res => res.json()),
  getTeacherProjects: () =>
    fetch("/api/teacher/projects", { credentials: "include" }).then(res => res.json()),
  getTeacherPendingTasks: () =>
    fetch("/api/teacher/pending-tasks", { credentials: "include" }).then(res => res.json()),
  getTeacherCurrentMilestones: () =>
    fetch("/api/teacher/current-milestones", { credentials: "include" }).then(res => res.json()),
  getStudentDeadlines: () =>
    fetch("/api/deadlines/student", { credentials: "include" }).then(res => res.json()),
  getSchoolStudentsProgress: () =>
    fetch("/api/teacher/school-students-progress", { credentials: "include" }).then(res => res.json()),
};
