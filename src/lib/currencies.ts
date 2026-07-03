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
