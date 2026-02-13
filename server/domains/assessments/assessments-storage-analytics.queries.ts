import {
  componentSkills,
  competencies,
  grades,
  milestones,
  projects,
  submissions,
  users,
} from "../../../shared/schema";
import { db } from "../../db";
import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import type {
  SchoolComponentSkillProgressDTO,
  SchoolSkillsStatsDTO,
  StudentCompetencyProgressRecord,
  UpcomingDeadlineDTO,
} from "./assessments.contracts";

export class AssessmentAnalyticsQueries {
  async getStudentCompetencyProgress(studentId: number): Promise<StudentCompetencyProgressRecord[]> {
    try {
      const allGrades = await db.select().from(grades);
      const allSubmissions = await db.select().from(submissions).where(eq(submissions.studentId, studentId));
      const allComponentSkills = await db.select().from(componentSkills);
      const allCompetencies = await db.select().from(competencies);

      const submissionIds = allSubmissions.map((s) => s.id);
      const studentGradesRaw = allGrades.filter(
        (g) => g.submissionId && submissionIds.includes(g.submissionId),
      );

      const skillMap = new Map(allComponentSkills.map((s) => [s.id, s]));
      const competencyMap = new Map(allCompetencies.map((c) => [c.id, c]));

      const studentGrades = studentGradesRaw
        .map((grade) => {
          const skill = skillMap.get(grade.componentSkillId || 0);
          const competency = skill?.competencyId ? competencyMap.get(skill.competencyId) : null;

          return {
            score: grade.score,
            gradedAt: grade.gradedAt,
            componentSkillId: grade.componentSkillId,
            componentSkillName: skill?.name || "Unknown Skill",
            competencyId: competency?.id || 0,
            competencyName: competency?.name || "Unknown Competency",
          };
        })
        .sort((a, b) => new Date(b.gradedAt || 0).getTime() - new Date(a.gradedAt || 0).getTime());

      const progressMap = new Map<
        string,
        {
          competencyId: number;
          competencyName: string;
          componentSkillId: number;
          componentSkillName: string;
          scores: { score: number; date: Date }[];
        }
      >();

      studentGrades.forEach((grade) => {
        const key = `${grade.competencyId}-${grade.componentSkillId}`;
        const score = Number(grade.score) || 0;

        if (!progressMap.has(key)) {
          progressMap.set(key, {
            competencyId: grade.competencyId || 0,
            competencyName: grade.competencyName,
            componentSkillId: grade.componentSkillId || 0,
            componentSkillName: grade.componentSkillName,
            scores: [],
          });
        }

        progressMap.get(key)!.scores.push({
          score,
          date: grade.gradedAt || new Date(),
        });
      });

      const results: StudentCompetencyProgressRecord[] = Array.from(progressMap.values()).map((item) => {
        item.scores.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const totalScores = item.scores.map((s) => s.score);
        const averageScore =
          totalScores.length > 0
            ? Math.round(totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length)
            : 0;

        const lastScore = totalScores[0] || 0;
        const secondLastScore = totalScores[1];

        let progressDirection: "improving" | "declining" | "stable" = "stable";
        if (totalScores.length > 1 && secondLastScore !== undefined) {
          if (lastScore > secondLastScore + 5) {
            progressDirection = "improving";
          } else if (lastScore < secondLastScore - 5) {
            progressDirection = "declining";
          }
        }

        const lastUpdated = item.scores[0]?.date?.toISOString() || new Date().toISOString();

        return {
          competencyId: item.competencyId,
          competencyName: item.competencyName,
          componentSkillId: item.componentSkillId,
          componentSkillName: item.componentSkillName,
          averageScore,
          totalScores,
          lastScore,
          lastUpdated,
          progressDirection,
        };
      });

      return results.sort((a, b) => a.competencyName.localeCompare(b.competencyName));
    } catch (error) {
      console.error("Error fetching student competency progress:", error);
      return [];
    }
  }

  async getSchoolComponentSkillsProgress(teacherId: number): Promise<SchoolComponentSkillProgressDTO[]> {
    try {
      const teacher = await db.select().from(users).where(eq(users.id, teacherId)).limit(1);
      const teacherSchoolId = teacher[0]?.schoolId;

      if (!teacherSchoolId) {
        return [];
      }

      const schoolStudents = await db.select().from(users).where(eq(users.schoolId, teacherSchoolId));
      if (schoolStudents.length === 0) {
        return [];
      }

      const studentIds = schoolStudents.map((s) => s.id);
      if (studentIds.length === 0) {
        return [];
      }

      const allGrades = await db.select().from(grades);
      const allSubmissions = await db
        .select()
        .from(submissions)
        .where(inArray(submissions.studentId, studentIds));
      const allComponentSkills = await db.select().from(componentSkills);
      const allCompetencies = await db.select().from(competencies);

      const skillMap = new Map(allComponentSkills.map((s) => [s.id, s]));
      const competencyMap = new Map(allCompetencies.map((c) => [c.id, c]));

      const submissionIds = allSubmissions.map((s) => s.id);
      const schoolGrades = allGrades.filter((g) => g.submissionId && submissionIds.includes(g.submissionId));

      const skillProgressMap = new Map<
        number,
        {
          grades: typeof schoolGrades;
          skill: (typeof allComponentSkills)[0];
          competency: (typeof allCompetencies)[0] | undefined;
        }
      >();

      schoolGrades.forEach((grade) => {
        const skill = skillMap.get(grade.componentSkillId || 0);
        if (!skill) {
          return;
        }

        const competency = skill.competencyId ? competencyMap.get(skill.competencyId) : undefined;

        if (!skillProgressMap.has(skill.id)) {
          skillProgressMap.set(skill.id, {
            grades: [],
            skill,
            competency,
          });
        }

        skillProgressMap.get(skill.id)!.grades.push(grade);
      });

      const skillsProgress: SchoolComponentSkillProgressDTO[] = [];

      for (const [, data] of Array.from(skillProgressMap.entries())) {
        const { grades: skillGrades, skill, competency } = data;

        if (skillGrades.length === 0) {
          continue;
        }

        const scores = skillGrades.map((g) => Number(g.score) || 0);
        const averageScore = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;

        const rubricDistribution = {
          emerging: skillGrades.filter((g) => g.rubricLevel === "emerging").length,
          developing: skillGrades.filter((g) => g.rubricLevel === "developing").length,
          proficient: skillGrades.filter((g) => g.rubricLevel === "proficient").length,
          applying: skillGrades.filter((g) => g.rubricLevel === "applying").length,
        };

        const strugglingStudents = skillGrades.filter((g) => (Number(g.score) || 0) < 2.5).length;
        const excellingStudents = skillGrades.filter((g) => (Number(g.score) || 0) >= 3.5).length;
        const passRate =
          ((rubricDistribution.proficient + rubricDistribution.applying) / skillGrades.length) * 100;

        const sortedByDate = [...skillGrades].sort(
          (a, b) => new Date(b.gradedAt || 0).getTime() - new Date(a.gradedAt || 0).getTime(),
        );

        const recentGrades = sortedByDate.slice(0, Math.floor(skillGrades.length / 2));
        const olderGrades = sortedByDate.slice(Math.floor(skillGrades.length / 2));

        let trend: "improving" | "declining" | "stable" = "stable";
        if (recentGrades.length > 0 && olderGrades.length > 0) {
          const recentAvg =
            recentGrades.reduce((sum: number, g) => sum + (Number(g.score) || 0), 0) /
            recentGrades.length;
          const olderAvg =
            olderGrades.reduce((sum: number, g) => sum + (Number(g.score) || 0), 0) /
            olderGrades.length;

          if (recentAvg > olderAvg + 0.5) {
            trend = "improving";
          } else if (recentAvg < olderAvg - 0.5) {
            trend = "declining";
          }
        }

        const lastAssessmentDate = sortedByDate[0]?.gradedAt || new Date().toISOString();

        skillsProgress.push({
          id: skill.id,
          name: skill.name,
          competencyId: competency?.id || 0,
          competencyName: competency?.name || "Unknown Competency",
          learnerOutcomeName: "XQ Learner Outcome",
          averageScore: Math.round(averageScore * 100) / 100,
          studentsAssessed: skillGrades.length,
          totalStudents: schoolStudents.length,
          passRate: Math.round(passRate * 100) / 100,
          strugglingStudents,
          excellingStudents,
          rubricDistribution,
          trend,
          lastAssessmentDate,
        });
      }

      return skillsProgress;
    } catch (error) {
      console.error("Error getting school component skills progress:", error);
      return [];
    }
  }

  async getSchoolSkillsStats(teacherId: number): Promise<SchoolSkillsStatsDTO> {
    try {
      const skillsProgress = await this.getSchoolComponentSkillsProgress(teacherId);

      if (skillsProgress.length === 0) {
        return {
          totalSkillsAssessed: 0,
          averageSchoolScore: 0,
          skillsNeedingAttention: 0,
          excellentPerformance: 0,
          studentsAssessed: 0,
          totalStudents: 0,
        };
      }

      const totalSkillsAssessed = skillsProgress.length;
      const averageSchoolScore =
        skillsProgress.reduce((sum, skill) => sum + skill.averageScore, 0) / totalSkillsAssessed;
      const skillsNeedingAttention = skillsProgress.filter((skill) => skill.averageScore < 2.5).length;
      const excellentPerformance = skillsProgress.filter((skill) => skill.averageScore >= 3.5).length;
      const studentsAssessed = Math.max(...skillsProgress.map((skill) => skill.studentsAssessed), 0);
      const totalStudents = Math.max(...skillsProgress.map((skill) => skill.totalStudents), 0);

      return {
        totalSkillsAssessed,
        averageSchoolScore: Math.round(averageSchoolScore * 100) / 100,
        skillsNeedingAttention,
        excellentPerformance,
        studentsAssessed,
        totalStudents,
      };
    } catch (error) {
      console.error("Error getting school skills stats:", error);
      return {
        totalSkillsAssessed: 0,
        averageSchoolScore: 0,
        skillsNeedingAttention: 0,
        excellentPerformance: 0,
        studentsAssessed: 0,
        totalStudents: 0,
      };
    }
  }

  async getUpcomingDeadlines(projectIds: number[]): Promise<UpcomingDeadlineDTO[]> {
    if (!projectIds.length) {
      return [];
    }

    const now = new Date();
    const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const upcomingMilestones = await db
      .select({
        milestoneId: milestones.id,
        title: milestones.title,
        dueDate: milestones.dueDate,
        projectTitle: projects.title,
        projectId: projects.id,
      })
      .from(milestones)
      .innerJoin(projects, eq(milestones.projectId, projects.id))
      .where(
        and(
          inArray(milestones.projectId, projectIds),
          gte(milestones.dueDate, now),
          sql`${milestones.dueDate} <= ${twoWeeksFromNow}`,
        ),
      )
      .orderBy(asc(milestones.dueDate));

    return upcomingMilestones;
  }
}
