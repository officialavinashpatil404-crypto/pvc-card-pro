/**
 * Dynamically determines the effective user plan based on DB plan field and remaining credit balance.
 */
export function getEffectivePlan(planFromDb: string | null | undefined, remainingCards: number = 0): string {
  if (remainingCards <= 0) {
    return 'Free';
  }
  
  const p = (planFromDb || '').trim();

  // If explicit paid plan name is set
  if (p === 'Business Pack' || p === 'Business') return 'Business Pack';
  if (p === 'Pro Pack' || p === 'Pro') return 'Pro Pack';
  if (p === 'Starter Pack' || p === 'Starter') return 'Starter Pack';

  // Balance-based smart resolution for edge cases or manual credit top-ups
  if (remainingCards >= 1400) return 'Business Pack';
  if (remainingCards >= 800) return 'Pro Pack';
  if (remainingCards >= 400) return 'Starter Pack';
  
  return 'Trial Pack';
}
