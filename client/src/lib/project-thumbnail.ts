import type { SyntheticEvent } from "react";

export const DEFAULT_PROJECT_THUMBNAIL_URL = "/default-project-thumbnail.svg";

export function getProjectThumbnailUrl(thumbnailUrl?: string | null): string {
  const normalizedUrl = thumbnailUrl?.trim();
  return normalizedUrl ? normalizedUrl : DEFAULT_PROJECT_THUMBNAIL_URL;
}

export function handleProjectThumbnailError(
  event: SyntheticEvent<HTMLImageElement>,
): void {
  if (event.currentTarget.src.includes(DEFAULT_PROJECT_THUMBNAIL_URL)) {
    return;
  }
  event.currentTarget.src = DEFAULT_PROJECT_THUMBNAIL_URL;
}
