import { z } from "zod";
import type {
  ComponentSkillWithDetailsDTO,
  HierarchyCompetencyDTO,
  LearnerOutcomeHierarchyItemDTO,
} from "@shared/contracts/api";

export const assessmentSchema = z.object({
  title: z.string().min(1, "Assessment title is required"),
  description: z.string().min(1, "Assessment description is required"),
  dueDate: z.string().min(1, "Due date is required").refine(
    (date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    },
    {
      message: "Due date must be today or in the future",
    },
  ),
  componentSkillIds: z.array(z.number()).min(1, "At least one component skill must be selected"),
  assessmentType: z.enum(["teacher", "self-evaluation"]).default("teacher"),
  allowSelfEvaluation: z.boolean().default(false),
  questions: z.array(z.object({
    text: z.string().min(1, "Question text is required"),
    type: z.enum(["open-ended", "multiple-choice", "short-answer"]),
    rubricCriteria: z.string().optional(),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().optional(),
  })).optional(),
}).refine((data) => {
  if (data.assessmentType === "teacher") {
    return data.questions && data.questions.length > 0 && data.questions.every((q) => q.text.trim().length > 0);
  }
  return true;
}, {
  message: "Questions are required for teacher assessments",
  path: ["questions"],
});

export type AssessmentForm = z.infer<typeof assessmentSchema>;
export type QuestionTypeKey = "open-ended" | "multiple-choice" | "short-answer";
export type AssessmentType = AssessmentForm["assessmentType"];

export function collectSelectedSkills(
  hierarchy: LearnerOutcomeHierarchyItemDTO[],
  selectedSkillIds: number[],
): ComponentSkillWithDetailsDTO[] {
  return hierarchy.flatMap((outcome) =>
    (outcome.competencies ?? []).flatMap((competency: HierarchyCompetencyDTO) =>
      (competency.componentSkills ?? [])
        .filter((skill) => selectedSkillIds.includes(skill.id))
        .map((skill) => ({
          ...skill,
          competencyId: competency.id,
          competencyName: competency.name,
          learnerOutcomeName: outcome.name,
        })),
    ),
  );
}
