export type RubricLevel = "emerging" | "developing" | "proficient" | "applying";

type RubricPalette = "teacher" | "student";

export interface RubricLevelMeta {
  value: RubricLevel;
  label: string;
  description: string;
  score: number;
}

const TEACHER_LEVEL_CLASSES: Record<RubricLevel, string> = {
  emerging: "bg-red-100 text-red-800 border-red-200",
  developing: "bg-yellow-100 text-yellow-800 border-yellow-200",
  proficient: "bg-blue-100 text-blue-800 border-blue-200",
  applying: "bg-green-100 text-green-800 border-green-200",
};

const STUDENT_LEVEL_CLASSES: Record<RubricLevel, string> = {
  emerging: "bg-orange-100 text-orange-800 border-orange-200",
  developing: "bg-yellow-100 text-yellow-800 border-yellow-200",
  proficient: "bg-blue-100 text-blue-800 border-blue-200",
  applying: "bg-green-100 text-green-800 border-green-200",
};

export const RUBRIC_LEVELS: readonly (RubricLevelMeta & { color: string })[] = [
  {
    value: "emerging",
    label: "Emerging",
    description: "Beginning to show understanding",
    score: 1,
    color: TEACHER_LEVEL_CLASSES.emerging,
  },
  {
    value: "developing",
    label: "Developing",
    description: "Showing progress toward understanding",
    score: 2,
    color: TEACHER_LEVEL_CLASSES.developing,
  },
  {
    value: "proficient",
    label: "Proficient",
    description: "Demonstrating solid understanding",
    score: 3,
    color: TEACHER_LEVEL_CLASSES.proficient,
  },
  {
    value: "applying",
    label: "Applying",
    description: "Applying understanding in new contexts",
    score: 4,
    color: TEACHER_LEVEL_CLASSES.applying,
  },
] as const;

export function getRubricLevelColor(level: string, palette: RubricPalette = "teacher"): string {
  const key = level.toLowerCase() as RubricLevel;
  const paletteMap = palette === "student" ? STUDENT_LEVEL_CLASSES : TEACHER_LEVEL_CLASSES;
  return paletteMap[key] || "bg-gray-100 text-gray-800 border-gray-200";
}
