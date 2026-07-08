export const SCHOLARSHIP_PASS_PERCENT = 50;
export const MAX_QUIZ_ATTEMPTS = 3;

export function isQuizPassed(score: number, totalQuestions: number): boolean {
  if (totalQuestions <= 0) return false;
  return (score / totalQuestions) * 100 >= SCHOLARSHIP_PASS_PERCENT;
}

export function hasScholarshipCode(couponCode?: string | null): boolean {
  return !!couponCode && couponCode.trim().length > 0;
}
