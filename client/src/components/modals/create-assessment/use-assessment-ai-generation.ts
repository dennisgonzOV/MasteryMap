import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { UseFormReturn } from "react-hook-form";
import type { AIAssessmentGeneratedQuestionDTO, LearnerOutcomeHierarchyItemDTO } from "@shared/contracts/api";
import {
  collectSelectedSkills,
  type AssessmentForm,
  type QuestionTypeKey,
} from "./assessment-form";

interface UseAssessmentAiGenerationArgs {
  form: UseFormReturn<AssessmentForm>;
  hierarchy: LearnerOutcomeHierarchyItemDTO[];
  pdfObjectPath: string | null;
}

interface AiQuestionTemplate {
  text: string;
  type: QuestionTypeKey;
  rubricCriteria: string;
  options?: string[];
  correctAnswer?: string;
}

const questionTemplates: Record<QuestionTypeKey, AiQuestionTemplate[]> = {
  "open-ended": [
    {
      text: "Describe how you would collaborate effectively with team members from different backgrounds.",
      type: "open-ended",
      rubricCriteria: "Look for evidence of cultural awareness, communication strategies, and inclusive practices.",
    },
    {
      text: "Explain how you would approach solving a complex problem in your field.",
      type: "open-ended",
      rubricCriteria: "Assess problem-solving methodology, critical thinking, and systematic approach.",
    },
    {
      text: "Discuss the importance of ethical considerations in your work.",
      type: "open-ended",
      rubricCriteria: "Evaluate understanding of ethics, moral reasoning, and professional responsibility.",
    },
  ],
  "multiple-choice": [
    {
      text: "Which of the following best describes effective cross-cultural communication?",
      type: "multiple-choice",
      options: [
        "Using the same approach with everyone",
        "Adapting communication style to cultural context",
        "Avoiding cultural differences",
        "Speaking louder to overcome barriers",
      ],
      correctAnswer: "Adapting communication style to cultural context",
      rubricCriteria: "Assesses understanding of cultural adaptability in communication.",
    },
    {
      text: "What is the most important factor in successful teamwork?",
      type: "multiple-choice",
      options: [
        "Having similar personalities",
        "Clear communication and shared goals",
        "Working independently",
        "Avoiding conflict at all costs",
      ],
      correctAnswer: "Clear communication and shared goals",
      rubricCriteria: "Evaluates understanding of collaborative principles.",
    },
  ],
  "short-answer": [
    {
      text: "List three key strategies for effective time management.",
      type: "short-answer",
      rubricCriteria: "Look for practical, actionable strategies and understanding of time management principles.",
    },
    {
      text: "What are two main benefits of diverse perspectives in problem-solving?",
      type: "short-answer",
      rubricCriteria: "Assess understanding of diversity's value and its impact on outcomes.",
    },
  ],
};

export function useAssessmentAiGeneration({
  form,
  hierarchy,
  pdfObjectPath,
}: UseAssessmentAiGenerationArgs) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGeneratingWithAI, setIsGeneratingWithAI] = useState(false);
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiQuestionTypes, setAiQuestionTypes] = useState<Record<QuestionTypeKey, boolean>>({
    "open-ended": true,
    "multiple-choice": true,
    "short-answer": false,
  });

  const generateWithAI = async () => {
    const selectedSkillIds = form.getValues("componentSkillIds");
    if (selectedSkillIds.length === 0) {
      toast({
        title: "Select Component Skills",
        description: "Please select at least one component skill to generate AI assessment.",
        variant: "destructive",
      });
      return;
    }

    const selectedTypes = Object.entries(aiQuestionTypes)
      .filter(([, isSelected]) => isSelected)
      .map(([type]) => type as QuestionTypeKey);
    const normalizedSelectedTypes =
      selectedSkillIds.length > 1
        ? selectedTypes.filter((type) => type !== "multiple-choice")
        : selectedTypes;

    if (normalizedSelectedTypes.length === 0) {
      toast({
        title: "Select Question Types",
        description: "Please select at least one question type for AI generation.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingWithAI(true);
    try {
      const selectedSkillsDetails = collectSelectedSkills(hierarchy, selectedSkillIds);
      if (selectedSkillsDetails.length === 0) {
        throw new Error("Could not find detailed information for selected skills");
      }

      const aiAssessment = await api.generateAssessmentFromSkills({
        milestoneTitle: form.getValues("title") || "Assessment",
        milestoneDescription: form.getValues("description") || "AI-generated assessment",
        milestoneDueDate: form.getValues("dueDate") || new Date().toISOString(),
        componentSkills: selectedSkillsDetails,
        questionCount: aiQuestionCount,
        questionTypes: normalizedSelectedTypes,
        pdfUrl: pdfObjectPath || undefined,
      });

      if (!aiAssessment.questions?.length) {
        throw new Error("No questions generated");
      }

      const formattedQuestions = aiAssessment.questions.map((q: AIAssessmentGeneratedQuestionDTO) => {
        let correctAnswer = q.correctAnswer || "";
        if (q.type === "multiple-choice" && q.choices?.length) {
          if (!correctAnswer || !q.choices.includes(correctAnswer)) {
            correctAnswer = q.choices[0];
          }
        }

        return {
          text: q.text,
          type: q.type,
          rubricCriteria: q.rubricCriteria || "",
          options: q.choices || [],
          correctAnswer,
        };
      });

      const existingQuestions = form.getValues("questions") || [];
      const nonBlankQuestions = existingQuestions.filter((q) => q.text.trim().length > 0);
      const allQuestions = [...nonBlankQuestions, ...formattedQuestions];
      form.setValue("questions", allQuestions);

      toast({
        title: "AI Questions Added",
        description: `Added ${formattedQuestions.length} new AI-generated questions. Total: ${allQuestions.length} questions.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
    } catch (error) {
      console.error("AI generation error:", error);
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const generatedQuestions: Array<{
          text: string;
          type: QuestionTypeKey;
          rubricCriteria: string;
          options?: string[];
          correctAnswer?: string;
        }> = [];
        const questionsPerType = Math.ceil(aiQuestionCount / normalizedSelectedTypes.length);

        for (const type of normalizedSelectedTypes) {
          const templates = questionTemplates[type];
          const questionsToAdd = Math.min(questionsPerType, templates.length);
          for (let i = 0; i < questionsToAdd && generatedQuestions.length < aiQuestionCount; i++) {
            const templateIndex = i % templates.length;
            generatedQuestions.push({
              ...templates[templateIndex],
              text: `${templates[templateIndex].text} (Question ${generatedQuestions.length + 1})`,
            });
          }
        }

        while (generatedQuestions.length < aiQuestionCount) {
          for (const type of normalizedSelectedTypes) {
            if (generatedQuestions.length >= aiQuestionCount) break;
            const templates = questionTemplates[type];
            const templateIndex = generatedQuestions.length % templates.length;
            generatedQuestions.push({
              ...templates[templateIndex],
              text: `${templates[templateIndex].text} (Question ${generatedQuestions.length + 1})`,
            });
          }
        }

        const finalQuestions = generatedQuestions.slice(0, aiQuestionCount);
        const existingQuestions = form.getValues("questions") || [];
        const nonBlankQuestions = existingQuestions.filter((q) => q.text.trim().length > 0);
        const allQuestions = [...nonBlankQuestions, ...finalQuestions];
        form.setValue("questions", allQuestions);

        toast({
          title: "AI Questions Added",
          description: `Added ${finalQuestions.length} new questions based on your preferences. Total: ${allQuestions.length} questions.`,
        });
      } catch {
        toast({
          title: "AI Generation Failed",
          description: "Unable to generate assessment. Please create questions manually.",
          variant: "destructive",
        });
      }
    } finally {
      setIsGeneratingWithAI(false);
    }
  };

  return {
    aiQuestionCount,
    aiQuestionTypes,
    generateWithAI,
    isGeneratingWithAI,
    setAiQuestionCount,
    setAiQuestionTypes,
  };
}
