import type { GradingData } from "./types";

function getStorageKey(assessmentId?: string): string {
  return `gradingData_${assessmentId ?? "unknown"}`;
}

export function loadGradingData(assessmentId?: string): GradingData {
  try {
    const saved = sessionStorage.getItem(getStorageKey(assessmentId));
    if (!saved) {
      return {};
    }
    return JSON.parse(saved) as GradingData;
  } catch {
    return {};
  }
}

export function saveGradingData(assessmentId: string | undefined, data: GradingData): void {
  try {
    sessionStorage.setItem(getStorageKey(assessmentId), JSON.stringify(data));
  } catch {
    // ignore storage errors to avoid interrupting grading flow
  }
}

export function clearSubmissionGradingData(
  assessmentId: string | undefined,
  submissionId: number,
): void {
  const saved = loadGradingData(assessmentId);
  if (!saved[submissionId]) {
    return;
  }

  delete saved[submissionId];
  saveGradingData(assessmentId, saved);
}
