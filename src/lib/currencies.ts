export interface Currency {
  code: string
  name: string
  symbol: string
  decimals: number
  thousandsSep: string
  decimalSep: string
}

export const CURRENCIES: Currency[] = [
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', decimals: 0, thousandsSep: '.', decimalSep: ',' },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2, thousandsSep: ',', decimalSep: '.' },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2, thousandsSep: ',', decimalSep: '.' },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimals: 2, thousandsSep: ',', decimalSep: '.' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimals: 0, thousandsSep: ',', decimalSep: '.' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimals: 2, thousandsSep: ',', decimalSep: '.' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimals: 2, thousandsSep: ',', decimalSep: '.' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', decimals: 2, thousandsSep: ',', decimalSep: '.' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimals: 2, thousandsSep: ',', decimalSep: '.' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimals: 2, thousandsSep: ',', decimalSep: '.' },
]

export const DEFAULT_CURRENCY_CODE = 'IDR'

export function getCurrency(code: string): Currency {
  return CURRENCIES.find(c => c.code === code) ?? CURRENCIES.find(c => c.code === DEFAULT_CURRENCY_CODE)!
}

// Parses a spreadsheet-formatted amount like "Rp108,800" or "$50.99" back
// into a plain number, for CSV import. Deliberately doesn't trust the
// currency's configured thousandsSep/decimalSep (that's the app's *display*
// convention, e.g. IDR shows as "108.800,00" in-app) — raw source data is
// typically plain "1,234.56"/"1.234,56"-style regardless of currency, so
// this picks the decimal separator by position (the later of the two, if
// both appear) and treats the other purely as a thousands grouping to strip.
export function parseCurrencyAmount(raw: string, currency: Currency): number | null {
  const stripped = raw.replace(currency.symbol, '').replace(/[^0-9.,-]/g, '').trim()
  if (!stripped) return null

  const lastDot = stripped.lastIndexOf('.')
  const lastComma = stripped.lastIndexOf(',')
  let normalized: string

  if (lastDot !== -1 && lastComma !== -1) {
    normalized = lastDot > lastComma
      ? stripped.replaceAll(',', '')
      : stripped.replaceAll('.', '').replace(',', '.')
  } else if (lastComma !== -1) {
    normalized = currency.decimals > 0 && stripped.length - lastComma - 1 === currency.decimals
      ? stripped.replace(',', '.')
      : stripped.replaceAll(',', '')
  } else if (lastDot !== -1) {
    normalized = currency.decimals > 0 && stripped.length - lastDot - 1 === currency.decimals
      ? stripped
      : stripped.replaceAll('.', '')
  } else {
    normalized = stripped
  }

  const n = parseFloat(normalized)
  return !isFinite(n) || n <= 0 ? null : n
}
