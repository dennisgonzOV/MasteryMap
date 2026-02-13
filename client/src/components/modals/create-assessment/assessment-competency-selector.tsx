import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronRight, ChevronDown } from "lucide-react";
import type { LearnerOutcomeHierarchyItemDTO } from "@shared/contracts/api";
import type { AssessmentType } from "./assessment-form";

interface AssessmentCompetencySelectorProps {
  hierarchy: LearnerOutcomeHierarchyItemDTO[];
  hierarchyLoading: boolean;
  assessmentType: AssessmentType;
  selectedSkillIds: number[];
  expandedOutcomes: Set<number>;
  expandedCompetencies: Set<number>;
  onToggleOutcome: (outcomeId: number) => void;
  onToggleCompetency: (competencyId: number) => void;
  onTeacherSkillToggle: (skillId: number, checked: boolean) => void;
  onSelfEvaluationSkillSelect: (skillId: number) => void;
}

export function AssessmentCompetencySelector({
  hierarchy,
  hierarchyLoading,
  assessmentType,
  selectedSkillIds,
  expandedOutcomes,
  expandedCompetencies,
  onToggleOutcome,
  onToggleCompetency,
  onTeacherSkillToggle,
  onSelfEvaluationSkillSelect,
}: AssessmentCompetencySelectorProps) {
  return (
    <div className="border rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50">
      {hierarchyLoading ? (
        <div className="text-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading component skills...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {hierarchy.map((outcome) => (
            <div key={outcome.id} className="bg-white rounded-lg border border-gray-200">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onToggleOutcome(outcome.id)}
                className="w-full px-4 py-3 h-auto flex items-center justify-between text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {expandedOutcomes.has(outcome.id) ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="font-medium text-gray-900">{outcome.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {outcome.competencies?.length || 0} competencies
                  </Badge>
                </div>
              </Button>

              {expandedOutcomes.has(outcome.id) && (
                <div className="px-4 pb-3 space-y-2">
                  {outcome.competencies?.map((competency) => (
                    <div key={competency.id} className="bg-gray-50 rounded-md border">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onToggleCompetency(competency.id)}
                        className="w-full px-3 py-2 h-auto flex items-center justify-between text-left hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          {expandedCompetencies.has(competency.id) ? (
                            <ChevronDown className="h-3 w-3 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-gray-400" />
                          )}
                          <span className="text-sm font-medium text-gray-700">{competency.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {competency.componentSkills?.length || 0} skills
                          </Badge>
                        </div>
                      </Button>

                      {expandedCompetencies.has(competency.id) && (
                        <div className="px-3 pb-2 space-y-1">
                          {competency.componentSkills?.map((skill) => (
                            <div key={`skill-${skill.id}`} className="flex items-start space-x-2 py-1">
                              {assessmentType === "self-evaluation" ? (
                                <>
                                  <input
                                    type="radio"
                                    id={`skill-${skill.id}`}
                                    name="componentSkill"
                                    checked={selectedSkillIds.includes(skill.id)}
                                    onChange={() => onSelfEvaluationSkillSelect(skill.id)}
                                    className="mt-0.5"
                                  />
                                  <label
                                    htmlFor={`skill-${skill.id}`}
                                    className="text-xs text-gray-600 cursor-pointer leading-tight"
                                  >
                                    {skill.name}
                                  </label>
                                </>
                              ) : (
                                <>
                                  <Checkbox
                                    id={`skill-${skill.id}`}
                                    checked={selectedSkillIds.includes(skill.id)}
                                    onCheckedChange={(checked) =>
                                      onTeacherSkillToggle(skill.id, checked as boolean)
                                    }
                                    className="mt-0.5"
                                  />
                                  <label
                                    htmlFor={`skill-${skill.id}`}
                                    className="text-xs text-gray-600 cursor-pointer leading-tight"
                                  >
                                    {skill.name}
                                  </label>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
