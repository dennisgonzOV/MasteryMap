export interface BestStandardsFilters {
  searchTerm?: string;
  subject?: string;
  grade?: string;
}

export function buildBestStandardsUrl(filters: BestStandardsFilters): string {
  const params = new URLSearchParams();

  if (filters.searchTerm?.trim()) {
    params.set("search", filters.searchTerm.trim());
  }

  if (filters.subject && filters.subject !== "all") {
    params.set("subject", filters.subject);
  }

  if (filters.grade && filters.grade !== "all") {
    params.set("grade", filters.grade);
  }

  const queryString = params.toString();
  return queryString ? `/api/competencies/best-standards?${queryString}` : "/api/competencies/best-standards";
}
