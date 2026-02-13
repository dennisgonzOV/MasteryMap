import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../../auth";
import type { AssessmentService } from "../assessments.service";

type CsvCell = string | number | Date | null | undefined;
type CsvRow = CsvCell[];
type CsvQuestion = { text?: string | null };
type SubmissionResponseMap = Record<string, unknown>;

function toCsvValue(value: unknown): string {
  if (typeof value === "string") {
    return value.replace(/,/g, ";");
  }
  if (value === null || value === undefined) {
    return "";
  }
  return JSON.stringify(value).replace(/,/g, ";");
}

function toQuestionList(value: unknown): CsvQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is CsvQuestion => typeof item === "object" && item !== null);
}

function toResponseMap(value: unknown): SubmissionResponseMap {
  if (typeof value !== "object" || value === null) {
    return {};
  }
  return value as SubmissionResponseMap;
}

export function registerAssessmentExportRoutes(router: Router, service: AssessmentService) {
  router.get("/:id/export-results", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await service.getAssessment(assessmentId);

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const submissionResults = await service.getSubmissionsByAssessment(assessmentId);

      const csvData = [
        ['Student Username', 'Submitted At', 'Feedback'],
        ...submissionResults.map((sub) => [
          sub.studentName || sub.studentUsername || 'Unknown',
          sub.submittedAt || '',
          (sub.feedback || '').replace(/,/g, ';'),
        ]),
      ];

      const csv = csvData.map((row) => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${assessment.title}-results.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Assessment export error:', error);
      res.status(500).json({ message: "Failed to export assessment results" });
    }
  });

  router.get("/:id/export-submissions", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await service.getAssessment(assessmentId);

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const detailedSubmissions = await service.getSubmissionsByAssessment(assessmentId);

      const csvData = [
        ['Student Username', 'Responses', 'Submitted At', 'Feedback'],
        ...detailedSubmissions.map((sub) => [
          sub.studentName || sub.studentUsername || 'Unknown',
          JSON.stringify(sub.responses || {}).replace(/,/g, ';'),
          sub.submittedAt || '',
          (sub.feedback || '').replace(/,/g, ';'),
        ]),
      ];

      const csv = csvData.map((row) => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${assessment.title}-submissions.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Submissions export error:', error);
      res.status(500).json({ message: "Failed to export submissions" });
    }
  });

  router.get("/:id/export-detailed-results", requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const assessmentId = parseInt(req.params.id);
      const assessment = await service.getAssessment(assessmentId);

      if (!assessment) {
        return res.status(404).json({ message: "Assessment not found" });
      }

      const detailedResults = await service.getSubmissionsByAssessment(assessmentId);
      const questions = toQuestionList(assessment.questions);

      const headers = ['Student Username', 'Submitted At'];
      questions.forEach((q, index) => {
        headers.push(`Q${index + 1}: ${(q.text || '').substring(0, 50)}...`);
      });
      headers.push('Feedback');

      const csvData: CsvRow[] = [headers];

      detailedResults.forEach((sub) => {
        const row = [
          sub.studentName || sub.studentUsername || 'Unknown',
          sub.submittedAt || '',
        ];

        const responses = toResponseMap(sub.responses);
        questions.forEach((_, index) => {
          const response = responses[String(index)] ?? '';
          row.push(toCsvValue(response));
        });

        row.push(toCsvValue(sub.feedback));
        csvData.push(row);
      });

      const csv = csvData.map((row) => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${assessment.title}-detailed-results.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Detailed export error:', error);
      res.status(500).json({ message: "Failed to export detailed results" });
    }
  });
}
