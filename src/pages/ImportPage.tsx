import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { parse as parseCsv } from 'papaparse'
import { parse as parseDate, isValid as isValidDate } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Check, UploadSimple } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useCategories } from '../hooks/useCategories'
import { useCoupleMembers } from '../hooks/useCoupleMembers'
import { getCurrency, parseCurrencyAmount } from '../lib/currencies'
import { formatCurrency } from '../lib/format'
import { toISODateLocal } from '../lib/dates'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const REQUIRED_HEADERS = ['category', 'amount', 'paid by', 'description', 'date']
const CHUNK_SIZE = 500

interface RawRow {
  category: string
  amount: string
  'paid by': string
  description: string
  date: string
}

interface ParsedRow {
  raw: RawRow
  amount: number | null
  category: string | null
  expense_date: string | null
  paid_by: string | null
  paid_by_label: string | null
  description: string
  errors: string[]
  manuallyExcluded: boolean
}

type Step = 'upload' | 'configure' | 'preview' | 'done'

// Sheet dates have no year ("Thursday, June 25") — the "date" candidate
// pulls the year from the year picked in the configure step. The others
// cover full dates in case a future export includes one.
function parseImportDate(raw: string, year: number): string | null {
  const trimmed = raw.trim()
  const candidates: { format: string; ref: Date }[] = [
    { format: 'EEEE, MMMM d', ref: new Date(year, 0, 1) },
    { format: 'MMMM d, yyyy', ref: new Date() },
    { format: 'yyyy-MM-dd', ref: new Date() },
    { format: 'M/d/yyyy', ref: new Date() },
  ]
  for (const { format, ref } of candidates) {
    const parsed = parseDate(trimmed, format, ref)
    if (isValidDate(parsed)) return toISODateLocal(parsed)
  }
  return null
}

export function ImportPage() {
  const navigate = useNavigate()
  const { user, couple } = useAuth()
  const categories = useCategories()
  const members = useCoupleMembers(couple?.couple_id)
  const currency = getCurrency(couple?.currency_code ?? 'IDR')

  const [step, setStep] = useState<Step>('upload')
  const [rawRows, setRawRows] = useState<RawRow[]>([])
  const [parseError, setParseError] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [selfName, setSelfName] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [committing, setCommitting] = useState(false)
  const [imported, setImported] = useState(0)

  const distinctPayers = useMemo(
    () => Array.from(new Set(rawRows.map(r => r['paid by']?.trim()).filter(Boolean))),
    [rawRows]
  )
  const tooManyPayers = distinctPayers.length > 2

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParseError('')
    parseCsv<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const fields = results.meta.fields ?? []
        const missing = REQUIRED_HEADERS.filter(h => !fields.includes(h))
        if (missing.length > 0) {
          setParseError(
            `This file is missing expected column(s): ${missing.join(', ')}. Expected: ${REQUIRED_HEADERS.join(', ')}.`
          )
          return
        }
        if (results.data.length === 0) {
          setParseError('No rows found in this file.')
          return
        }
        setRawRows(results.data)
        setStep('configure')
      },
      error: err => setParseError(err.message),
    })
  }

  function handleConfigure() {
    if (!selfName || tooManyPayers) return

    const otherRaw = distinctPayers.find(p => p.toLowerCase() !== selfName.toLowerCase()) ?? null
    const otherMember = otherRaw
      ? members.find(m => m.user_id !== user?.id && m.display_name.toLowerCase() === otherRaw.toLowerCase())
      : undefined

    const built: ParsedRow[] = rawRows.map(raw => {
      const payerRaw = raw['paid by']?.trim() ?? ''
      let paid_by: string | null = null
      let paid_by_label: string | null = null
      if (payerRaw.toLowerCase() === selfName.toLowerCase()) {
        paid_by = user!.id
      } else if (otherMember) {
        paid_by = otherMember.user_id
      } else {
        paid_by_label = payerRaw || null
      }

      const amount = parseCurrencyAmount(raw.amount ?? '', currency)
      const categoryMatch = categories.find(
        c => c.name.toLowerCase() === (raw.category ?? '').trim().toLowerCase()
      )
      const expense_date = parseImportDate(raw.date ?? '', year)

      const errors: string[] = []
      if (!amount) errors.push('invalid amount')
      if (!categoryMatch) errors.push('unknown category')
      if (!expense_date) errors.push('unparseable date')
      if (!payerRaw) errors.push('missing paid by')

      return {
        raw,
        amount,
        category: categoryMatch?.name ?? null,
        expense_date,
        paid_by,
        paid_by_label,
        description: (raw.description ?? '').trim(),
        errors,
        manuallyExcluded: false,
      }
    })

    setRows(built)
    setStep('preview')
  }

  function fixRowCategory(index: number, categoryName: string) {
    setRows(prev =>
      prev.map((r, i) =>
        i === index ? { ...r, category: categoryName, errors: r.errors.filter(e => e !== 'unknown category') } : r
      )
    )
  }

  function toggleManualExclude(index: number) {
    setRows(prev => prev.map((r, i) => (i === index ? { ...r, manuallyExcluded: !r.manuallyExcluded } : r)))
  }

  const readyRows = rows.filter(r => r.errors.length === 0 && !r.manuallyExcluded)
  const readyTotal = readyRows.reduce((s, r) => s + (r.amount ?? 0), 0)

  async function handleCommit() {
    if (!couple || readyRows.length === 0) return
    setCommitting(true)

    for (let i = 0; i < readyRows.length; i += CHUNK_SIZE) {
      const chunk = readyRows.slice(i, i + CHUNK_SIZE).map(r => ({
        couple_id: couple.couple_id,
        paid_by: r.paid_by,
        paid_by_label: r.paid_by_label,
        logged_by: user!.id,
        amount: r.amount,
        category: r.category,
        description: r.description,
        expense_date: r.expense_date,
        recurring_expense_id: null,
      }))
      const { error } = await supabase.from('expenses').insert(chunk)
      if (error) {
        toast(`Import failed: ${error.message}`)
        setCommitting(false)
        return
      }
    }

    setImported(readyRows.length)
    setCommitting(false)
    setStep('done')
    toast(`Imported ${readyRows.length} expense${readyRows.length === 1 ? '' : 's'}`)
  }

  return (
    <div className="space-y-5 p-6">
      <button
        onClick={() => navigate('/settings')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Settings
      </button>

      <div>
        <h1 className="font-heading text-xl font-medium text-foreground">Import expenses</h1>
        <p className="text-sm text-muted-foreground">Load expenses from a CSV export of your spreadsheet.</p>
      </div>

      {step === 'upload' && (
        <Card className="space-y-3 p-5">
          <p className="text-sm text-muted-foreground">
            Expects columns:{' '}
            <span className="font-medium text-foreground">category, amount, paid by, description, date</span>.
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-10 text-center transition-colors hover:bg-muted">
            <UploadSimple className="size-6 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Choose a CSV file</span>
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
          </label>
          {parseError && <p className="text-sm text-destructive">{parseError}</p>}
        </Card>
      )}

      {step === 'configure' && (
        <Card className="space-y-5 p-5">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Year</p>
            <p className="text-sm text-muted-foreground">
              Dates like "Thursday, June 25" don't include a year — which year is this file from?
            </p>
            <Input
              type="number"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Which name is you?</p>
            <div className="overflow-hidden rounded-lg border border-border">
              {distinctPayers.map(name => {
                const selected = selfName === name
                return (
                  <button
                    key={name}
                    onClick={() => setSelfName(name)}
                    className="flex w-full items-center justify-between border-b border-border px-4 py-3.5 text-left text-sm font-medium text-foreground last:border-b-0"
                  >
                    {name}
                    {selected && <Check className="size-4" weight="bold" />}
                  </button>
                )
              })}
            </div>
            {tooManyPayers && (
              <p className="text-sm text-destructive">
                This file has more than 2 different "paid by" names — a couple can only have 2 members. Fix the
                file and re-upload.
              </p>
            )}
          </div>

          <Button onClick={handleConfigure} disabled={!selfName || tooManyPayers} className="w-full">
            Continue
          </Button>
        </Card>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <Card className="space-y-1.5 p-5">
            <p className="text-sm text-foreground">
              <span className="font-medium">{readyRows.length}</span> ready to import
              {rows.length - readyRows.length > 0 && (
                <span className="text-muted-foreground"> · {rows.length - readyRows.length} skipped</span>
              )}
            </p>
            <p className="font-heading text-lg font-medium text-foreground">
              {formatCurrency(readyTotal, couple?.currency_code)}
            </p>
            <p className="text-xs text-muted-foreground">
              Re-importing the same file will create duplicate expenses — only import each file once.
            </p>
          </Card>

          <div className="space-y-2">
            {rows.map((row, i) => {
              const excluded = row.errors.length > 0 || row.manuallyExcluded
              const payerLabel =
                row.paid_by === user?.id ? 'You' : row.paid_by ? 'Partner' : (row.paid_by_label ?? 'Partner')
              const categoryMeta = categories.find(c => c.name === row.category)

              return (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-sm ${excluded ? 'border-border/50 opacity-60' : 'border-border'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-foreground">
                      {row.expense_date ?? row.raw.date} · {row.description || row.raw.category}
                    </span>
                    <span className="font-heading tabular-nums text-foreground">
                      {row.amount ? formatCurrency(row.amount, couple?.currency_code) : row.raw.amount}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{payerLabel}</span>
                    {row.category ? (
                      <span>
                        {categoryMeta?.icon} {row.category}
                      </span>
                    ) : (
                      <select
                        value=""
                        onChange={e => fixRowCategory(i, e.target.value)}
                        className="rounded border border-border bg-input/30 px-1.5 py-0.5 text-xs text-foreground"
                      >
                        <option value="" disabled>
                          Fix category…
                        </option>
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>
                            {c.icon} {c.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {row.errors.length > 0 ? (
                    <p className="mt-1.5 text-xs text-destructive">{row.errors.join(', ')}</p>
                  ) : (
                    <button
                      onClick={() => toggleManualExclude(i)}
                      className="mt-1.5 text-xs font-medium text-muted-foreground underline"
                    >
                      {row.manuallyExcluded ? 'Include' : 'Exclude'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setStep('configure')}>
              Back
            </Button>
            <Button className="flex-1" onClick={handleCommit} disabled={committing || readyRows.length === 0}>
              {committing ? 'Importing…' : `Import ${readyRows.length} expense${readyRows.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <Card className="space-y-3 p-5 text-center">
          <p className="text-base font-medium text-foreground">
            Imported {imported} expense{imported === 1 ? '' : 's'}
          </p>
          <Button onClick={() => navigate('/log')} className="w-full">
            Back to log
          </Button>
        </Card>
      )}
    </div>
  )
}
