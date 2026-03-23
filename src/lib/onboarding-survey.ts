/**
 * Accounts created before this instant are not required to complete the onboarding survey.
 * Override with env `ONBOARDING_SURVEY_REQUIRED_SINCE` (ISO 8601).
 */
export const ONBOARDING_SURVEY_REQUIRED_SINCE = new Date(
  process.env.ONBOARDING_SURVEY_REQUIRED_SINCE ?? "2026-03-21T00:00:00.000Z"
)

export function needsOnboardingSurveyForUser(createdAt: Date | null | undefined, completedAt: Date | null | undefined): boolean {
  if (completedAt) return false
  if (!createdAt || Number.isNaN(createdAt.getTime())) return false
  return createdAt >= ONBOARDING_SURVEY_REQUIRED_SINCE
}
