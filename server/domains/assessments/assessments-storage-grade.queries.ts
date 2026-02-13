import {
  componentSkills,
  competencies,
  credentials,
  grades,
  type Grade,
} from "../../../shared/schema";
import { db } from "../../db";
import { and, eq, or } from "drizzle-orm";
import type {
  ComponentSkillRecord,
  CredentialRecord,
  GradeUpdateInput,
  SubmissionGradeRecord,
  SubmissionGradeSummaryRecord,
} from "./assessments.contracts";

export class AssessmentGradeQueries {
  async createGrade(grade: Omit<Grade, "id" | "gradedAt">): Promise<Grade> {
    const [newGrade] = await db.insert(grades).values(grade).returning();
    return newGrade;
  }

  async getGradesBySubmission(submissionId: number): Promise<SubmissionGradeSummaryRecord[]> {
    return db
      .select({
        id: grades.id,
        submissionId: grades.submissionId,
        componentSkillId: grades.componentSkillId,
        rubricLevel: grades.rubricLevel,
        score: grades.score,
        feedback: grades.feedback,
        gradedBy: grades.gradedBy,
        gradedAt: grades.gradedAt,
        componentSkillName: componentSkills.name,
        competencyName: competencies.name,
      })
      .from(grades)
      .leftJoin(componentSkills, eq(grades.componentSkillId, componentSkills.id))
      .leftJoin(competencies, eq(componentSkills.competencyId, competencies.id))
      .where(eq(grades.submissionId, submissionId))
      .orderBy(grades.gradedAt);
  }

  async getComponentSkill(id: number): Promise<ComponentSkillRecord | undefined> {
    const componentSkill = await db
      .select()
      .from(componentSkills)
      .where(eq(componentSkills.id, id))
      .limit(1);

    return componentSkill[0];
  }

  async getExistingGrade(submissionId: number, componentSkillId: number): Promise<Grade | undefined> {
    const grade = await db
      .select()
      .from(grades)
      .where(and(eq(grades.submissionId, submissionId), eq(grades.componentSkillId, componentSkillId)))
      .limit(1);

    return grade[0];
  }

  async updateGrade(gradeId: number, updates: GradeUpdateInput): Promise<Grade> {
    const [updatedGrade] = await db
      .update(grades)
      .set({
        ...updates,
        gradedAt: new Date(),
      })
      .where(eq(grades.id, gradeId))
      .returning();

    return updatedGrade;
  }

  async checkAndAwardBadge(studentId: number, competencyId: number, gradedBy: number): Promise<CredentialRecord[]> {
    const awardedCredentials: CredentialRecord[] = [];

    try {
      const existingBadge = await db
        .select()
        .from(credentials)
        .where(
          and(
            eq(credentials.studentId, studentId),
            eq(credentials.competencyId, competencyId),
            eq(credentials.type, "badge"),
          ),
        )
        .limit(1);

      if (existingBadge.length > 0) {
        return awardedCredentials;
      }

      const allComponentSkills = await db
        .select()
        .from(componentSkills)
        .where(eq(componentSkills.competencyId, competencyId));

      if (allComponentSkills.length === 0) {
        return awardedCredentials;
      }

      const proficientStickers = await db
        .select()
        .from(credentials)
        .innerJoin(componentSkills, eq(credentials.componentSkillId, componentSkills.id))
        .where(
          and(
            eq(credentials.studentId, studentId),
            eq(credentials.type, "sticker"),
            eq(componentSkills.competencyId, competencyId),
            or(eq(credentials.iconUrl, "blue"), eq(credentials.iconUrl, "green")),
          ),
        );

      const stickerSkillIds = new Set(proficientStickers.map((s) => s.credentials.componentSkillId));
      const hasAllSkills = allComponentSkills.every((skill) => stickerSkillIds.has(skill.id));

      if (hasAllSkills) {
        const competency = await db
          .select()
          .from(competencies)
          .where(eq(competencies.id, competencyId))
          .limit(1);

        if (competency.length > 0) {
          const badgeTitle = `${competency[0].name} Badge`;
          const badgeDescription = `Achieved proficiency in all component skills for ${competency[0].name}`;

          const newBadge = await db
            .insert(credentials)
            .values({
              studentId,
              competencyId,
              type: "badge",
              title: badgeTitle,
              description: badgeDescription,
              iconUrl: "gold",
              awardedAt: new Date(),
              approvedBy: gradedBy,
            })
            .returning();

          awardedCredentials.push(newBadge[0]);
        }
      }
    } catch (error) {
      console.error("Error checking/awarding badge for competency:", error);
    }

    return awardedCredentials;
  }

  async awardStickersForGrades(studentId: number, submissionGrades: SubmissionGradeRecord[]): Promise<CredentialRecord[]> {
    const awardedCredentials: CredentialRecord[] = [];

    const rubricRank: Record<string, number> = {
      emerging: 1,
      developing: 2,
      proficient: 3,
      applying: 4,
    };

    const getStickerColor = (level: string): string => {
      switch (level) {
        case "applying":
          return "green";
        case "proficient":
          return "blue";
        case "developing":
          return "yellow";
        case "emerging":
          return "red";
        default:
          return "blue";
      }
    };

    const getDisplayName = (level: string): string => {
      switch (level) {
        case "applying":
          return "Applying";
        case "proficient":
          return "Proficient";
        case "developing":
          return "Developing";
        case "emerging":
          return "Emerging";
        default:
          return "Proficient";
      }
    };

    try {
      const competenciesToCheck = new Set<number>();

      for (const grade of submissionGrades) {
        if (
          grade.componentSkillId != null &&
          grade.rubricLevel &&
          ["emerging", "developing", "proficient", "applying"].includes(grade.rubricLevel)
        ) {
          const existingCredential = await db
            .select()
            .from(credentials)
            .where(
              and(
                eq(credentials.studentId, studentId),
                eq(credentials.componentSkillId, grade.componentSkillId),
                eq(credentials.type, "sticker"),
              ),
            )
            .limit(1);

          const componentSkill = await this.getComponentSkill(grade.componentSkillId);
          if (!componentSkill) {
            continue;
          }

          const stickerColor = getStickerColor(grade.rubricLevel);
          const displayName = getDisplayName(grade.rubricLevel);
          const stickerTitle = `${displayName} ${componentSkill.name}`;

          if (existingCredential.length === 0) {
            const newCredential = await db
              .insert(credentials)
              .values({
                studentId,
                componentSkillId: grade.componentSkillId,
                type: "sticker",
                title: stickerTitle,
                description: `Achieved ${grade.rubricLevel} level in ${componentSkill.name}`,
                iconUrl: stickerColor,
                awardedAt: new Date(),
                approvedBy: grade.gradedBy,
              })
              .returning();

            awardedCredentials.push(newCredential[0]);
          } else {
            const colorToLevel: Record<string, string> = {
              red: "emerging",
              yellow: "developing",
              blue: "proficient",
              green: "applying",
            };
            const existingLevel = colorToLevel[existingCredential[0].iconUrl || ""] || "";
            const existingRank = rubricRank[existingLevel] || 0;
            const newRank = rubricRank[grade.rubricLevel] || 0;

            if (newRank > existingRank) {
              const updatedCredential = await db
                .update(credentials)
                .set({
                  title: stickerTitle,
                  description: `Achieved ${grade.rubricLevel} level in ${componentSkill.name}`,
                  iconUrl: stickerColor,
                  awardedAt: new Date(),
                  approvedBy: grade.gradedBy,
                })
                .where(eq(credentials.id, existingCredential[0].id))
                .returning();

              awardedCredentials.push(updatedCredential[0]);
            }
          }

          if (componentSkill.competencyId) {
            competenciesToCheck.add(componentSkill.competencyId);
          }
        }
      }

      const badgeApproverId = submissionGrades.find((grade) => grade.gradedBy != null)?.gradedBy;
      for (const competencyId of Array.from(competenciesToCheck)) {
        if (badgeApproverId != null) {
          const badgeCredentials = await this.checkAndAwardBadge(studentId, competencyId, badgeApproverId);
          awardedCredentials.push(...badgeCredentials);
        }
      }
    } catch (error) {
      console.error("Error awarding stickers for grades:", error);
    }

    return awardedCredentials;
  }
}
