import { apiRequest } from "./queryClient";

export const api = {
  // Auth
  getCurrentUser: () => fetch("/api/auth/user", { credentials: "include" }).then(res => res.json()),
  
  // Projects
  getProjects: () => fetch("/api/projects", { credentials: "include" }).then(res => res.json()),
  createProject: (data: any) => apiRequest("POST", "/api/projects", data),
  getProject: (id: number) => fetch(`/api/projects/${id}`, { credentials: "include" }).then(res => res.json()),
  generateMilestones: (projectId: number) => apiRequest("POST", `/api/projects/${projectId}/generate-milestones`),
  assignStudents: (projectId: number, studentIds: string[]) => 
    apiRequest("POST", `/api/projects/${projectId}/assign`, { studentIds }),
  
  // Milestones
  getMilestones: (projectId: number) => 
    fetch(`/api/projects/${projectId}/milestones`, { credentials: "include" }).then(res => res.json()),
  createMilestone: (data: any) => apiRequest("POST", "/api/milestones", data),
  
  // Assessments
  getAssessments: (milestoneId: number) => 
    fetch(`/api/milestones/${milestoneId}/assessments`, { credentials: "include" }).then(res => res.json()),
  generateAssessment: (milestoneId: number) => 
    apiRequest("POST", `/api/milestones/${milestoneId}/generate-assessment`),
  
  // Submissions
  createSubmission: (data: any) => apiRequest("POST", "/api/submissions", data),
  getStudentSubmissions: () => 
    fetch("/api/submissions/student", { credentials: "include" }).then(res => res.json()),
  getAssessmentSubmissions: (assessmentId: number) => 
    fetch(`/api/assessments/${assessmentId}/submissions`, { credentials: "include" }).then(res => res.json()),
  gradeSubmission: (submissionId: number, data: any) => 
    apiRequest("POST", `/api/submissions/${submissionId}/grade`, data),
  
  // Credentials
  getStudentCredentials: () => 
    fetch("/api/credentials/student", { credentials: "include" }).then(res => res.json()),
  awardCredential: (data: any) => apiRequest("POST", "/api/credentials", data),
  
  // Portfolio
  getPortfolioArtifacts: () => 
    fetch("/api/portfolio/artifacts", { credentials: "include" }).then(res => res.json()),
  createPortfolioArtifact: (data: any) => apiRequest("POST", "/api/portfolio/artifacts", data),
  
  // Competencies
  getCompetencies: () => 
    fetch("/api/competencies", { credentials: "include" }).then(res => res.json()),
  getOutcomes: (competencyId: number) => 
    fetch(`/api/competencies/${competencyId}/outcomes`, { credentials: "include" }).then(res => res.json()),
};
