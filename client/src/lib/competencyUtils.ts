
interface ComponentSkill {
  id: number;
  name: string;
  competencyId: number;
  competencyName: string;
  competencyCategory: string;
  learnerOutcomeName: string;
  learnerOutcomeType: string;
}

interface Assessment {
  componentSkillIds: number[];
}

export const getCompetencyInfo = (assessment: Assessment, componentSkillsDetails: ComponentSkill[]) => {
  if (!assessment.componentSkillIds || !componentSkillsDetails) return [];
  
  const skillIds = Array.isArray(assessment.componentSkillIds) 
    ? assessment.componentSkillIds 
    : JSON.parse(assessment.componentSkillIds || '[]');
  
  const skills = componentSkillsDetails.filter((skill: ComponentSkill) => 
    skillIds.includes(skill.id)
  );
  
  // Group by competency
  const competencyGroups = skills.reduce((acc: any, skill: ComponentSkill) => {
    const key = skill.competencyId;
    if (!acc[key]) {
      acc[key] = {
        competencyName: skill.competencyName,
        competencyCategory: skill.competencyCategory,
        learnerOutcomeName: skill.learnerOutcomeName,
        learnerOutcomeType: skill.learnerOutcomeType,
        skills: []
      };
    }
    acc[key].skills.push(skill);
    return acc;
  }, {});
  
  return Object.values(competencyGroups);
};
