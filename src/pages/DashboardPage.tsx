import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { useAuth } from '../hooks/useAuth'
import { useExpenses } from '../hooks/useExpenses'
import { useCoupleMembers } from '../hooks/useCoupleMembers'
import { formatCurrency } from '../lib/format'
import { categoryColor } from '../lib/categoryColors'

const cardStyle: React.CSSProperties = {
  background: 'var(--color-char)',
  border: '1px solid rgba(229,229,229,0.08)',
  borderRadius: 'var(--radius-card)',
  padding: '20px',
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: '15px', fontWeight: 500, color: 'var(--color-bone)',
}

function dateKey(d: Date) {
  return d.toISOString().split('T')[0]
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function TooltipBox({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(29,29,29,0.95)', backdropFilter: 'blur(20px)',
      border: '1px solid rgba(229,229,229,0.10)', borderRadius: '10px',
      padding: '8px 12px', fontSize: '13px', color: 'var(--color-bone)',
    }}>
      <div style={{ color: 'var(--color-fog)', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-geist)' }}>{formatCurrency(payload[0].value)}</div>
    </div>
  )
}

export function DashboardPage() {
  const { user, couple } = useAuth()
  const { expenses } = useExpenses(couple?.couple_id)
  const members = useCoupleMembers(couple?.couple_id)

  const now = useMemo(() => new Date(), [])

  const { monthlyTotal, lastMonthTotal, dailySpend, categoryBreakdown, paidByTotals } = useMemo(() => {
    const thisMonthStart = startOfMonth(now)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    let monthlyTotal = 0
    let lastMonthTotal = 0
    const categoryMap = new Map<string, number>()
    const paidByMap = new Map<string, number>()

    for (const e of expenses) {
      const d = new Date(e.expense_date + 'T12:00:00')
      if (d >= thisMonthStart) {
        monthlyTotal += e.amount
        categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + e.amount)
        paidByMap.set(e.paid_by, (paidByMap.get(e.paid_by) ?? 0) + e.amount)
      } else if (d >= lastMonthStart && d <= lastMonthEnd) {
        lastMonthTotal += e.amount
      }
    }

    // Trailing 30 days, oldest to newest
    const dayTotals = new Map<string, number>()
    for (const e of expenses) dayTotals.set(e.expense_date, (dayTotals.get(e.expense_date) ?? 0) + e.amount)
    const dailySpend = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now)
      d.setDate(d.getDate() - (29 - i))
      const key = dateKey(d)
      return {
        date: key,
        label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        total: dayTotals.get(key) ?? 0,
      }
    })

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    return { monthlyTotal, lastMonthTotal, dailySpend, categoryBreakdown, paidByTotals: paidByMap }
  }, [expenses, now])

  const momDelta = monthlyTotal - lastMonthTotal
  const momPercent = lastMonthTotal > 0 ? (momDelta / lastMonthTotal) * 100 : null

  const partner = members.find(m => m.user_id !== user?.id)
  const youTotal = paidByTotals.get(user?.id ?? '') ?? 0
  const partnerTotal = partner ? (paidByTotals.get(partner.user_id) ?? 0) : 0
  const splitTotal = youTotal + partnerTotal
  const youPct = splitTotal > 0 ? (youTotal / splitTotal) * 100 : 50

  return (
    <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--color-bone)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
        Dashboard
      </h1>

      {/* Monthly total */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: '13px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
              This month
            </p>
            <p style={{ fontFamily: 'var(--font-geist)', fontSize: '32px', fontWeight: 500, color: 'var(--color-bone)' }}>
              {formatCurrency(monthlyTotal)}
            </p>
          </div>
          {momPercent !== null && (
            <span style={{
              fontSize: '13px', fontWeight: 500,
              color: momDelta > 0 ? 'var(--color-danger)' : momDelta < 0 ? 'var(--color-success)' : 'var(--color-fog)',
              marginTop: '20px',
            }}>
              {momDelta > 0 ? '↑' : momDelta < 0 ? '↓' : '–'} {Math.abs(momPercent).toFixed(0)}% vs last month
            </span>
          )}
        </div>
      </div>

      {/* Daily spend, trailing 30 days */}
      <div style={cardStyle}>
        <p style={cardTitleStyle}>Daily spend — last 30 days</p>
        <div style={{ height: '160px', marginTop: '12px', marginLeft: '-12px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailySpend}>
              <XAxis
                dataKey="label"
                interval={Math.ceil(dailySpend.length / 6)}
                tick={{ fill: 'var(--color-fog)', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(229,229,229,0.10)' }}
                tickLine={false}
              />
              <Tooltip content={<TooltipBox />} cursor={{ fill: 'rgba(229,229,229,0.06)' }} />
              <Bar dataKey="total" fill="var(--color-iron)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown */}
      <div style={cardStyle}>
        <p style={cardTitleStyle}>By category — this month</p>
        {categoryBreakdown.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--color-fog)', marginTop: '12px' }}>No expenses logged this month yet.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '8px' }}>
            <div style={{ width: '140px', height: '140px', flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">
                    {categoryBreakdown.map(c => <Cell key={c.name} fill={categoryColor(c.name)} />)}
                  </Pie>
                  <Tooltip content={<TooltipBox />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categoryBreakdown.map(c => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: categoryColor(c.name), flexShrink: 0 }} />
                  <span style={{ color: 'var(--color-mist)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  <span style={{ fontFamily: 'var(--font-geist)', color: 'var(--color-bone)' }}>{formatCurrency(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Who paid more */}
      <div style={cardStyle}>
        <p style={cardTitleStyle}>Who paid — this month</p>
        {splitTotal === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--color-fog)', marginTop: '12px' }}>No expenses logged this month yet.</p>
        ) : (
          <div style={{ marginTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--color-bone)', fontWeight: 500 }}>You · {formatCurrency(youTotal)}</span>
              <span style={{ color: 'var(--color-fog)', fontWeight: 500 }}>{partner?.display_name ?? 'Partner'} · {formatCurrency(partnerTotal)}</span>
            </div>
            <div style={{ height: '8px', borderRadius: '9999px', background: 'var(--color-ink)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${youPct}%`, background: 'var(--color-bone)' }} />
              <div style={{ width: `${100 - youPct}%`, background: 'var(--color-iron)' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
