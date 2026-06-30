export const CATEGORY_COLORS: Record<string, string> = {
  'Groceries': '#f0a868',
  'Food & Drink': '#e8847c',
  'Transport': '#6ba3d6',
  'Rent/Bills': '#9b8cd9',
  'Entertainment': '#e0a8d8',
  'Health': '#7bc9a8',
  'Shopping': '#d6c178',
  'Other': '#8a8a8a',
}

export function categoryColor(name: string): string {
  return CATEGORY_COLORS[name] ?? CATEGORY_COLORS['Other']
}
