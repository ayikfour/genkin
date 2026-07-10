import { getCurrency, DEFAULT_CURRENCY_CODE } from './currencies'

export function formatCurrency(amount: number, currencyCode: string = DEFAULT_CURRENCY_CODE): string {
  const currency = getCurrency(currencyCode)
  const fixed = amount.toFixed(currency.decimals)
  const [intPart, decPart] = fixed.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, currency.thousandsSep)
  const number = decPart !== undefined ? `${grouped}${currency.decimalSep}${decPart}` : grouped
  return `${currency.symbol} ${number}`
}

export function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// Feed rows are grouped under a day header (see FeedPage), so a row only
// needs to show the time-of-day the action happened, not repeat the date.
export function formatActivityTime(createdAtIso: string): string {
  return new Date(createdAtIso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}
