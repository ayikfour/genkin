// Insights that name or compare the partner directly (real display_name,
// spend-vs-spend copy) are never shareable — posting them publicly would
// put someone else's name/spending online without their say. Denylist, not
// allowlist, so any new insight id added to spendingInsights.ts later is
// shareable by default unless explicitly excluded here.
const NON_SHAREABLE_INSIGHT_IDS = new Set(['partner-category-comparison', 'who-paid-more'])

export function isShareableInsight(id: string): boolean {
  return !NON_SHAREABLE_INSIGHT_IDS.has(id)
}
