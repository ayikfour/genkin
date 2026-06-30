import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { formatCurrency } from '../lib/format'

interface BalanceRow {
  user_id: string
  display_name: string
  owes: number
  paid: number
  net: number
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-char)',
  border: '1px solid rgba(229,229,229,0.08)',
  borderRadius: 'var(--radius-card)',
  padding: '20px',
}

export function BalancePage() {
  const { user, couple } = useAuth()
  const [rows, setRows] = useState<BalanceRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!couple) return
    supabase.rpc('get_monthly_balance').then(({ data }) => {
      setRows(data ?? [])
      setLoading(false)
    })
  }, [couple])

  const you = rows.find(r => r.user_id === user?.id)
  const partner = rows.find(r => r.user_id !== user?.id)
  const net = you?.net ?? 0 // positive = you're owed, negative = you owe

  let headline: string
  let tone: 'success' | 'danger' | 'neutral'
  if (Math.abs(net) < 0.01) {
    headline = "You're all settled up"
    tone = 'neutral'
  } else if (net > 0) {
    headline = `${partner?.display_name ?? 'Your partner'} owes you`
    tone = 'success'
  } else {
    headline = `You owe ${partner?.display_name ?? 'your partner'}`
    tone = 'danger'
  }

  const toneColor = tone === 'success' ? 'var(--color-success)' : tone === 'danger' ? 'var(--color-danger)' : 'var(--color-bone)'

  return (
    <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--color-bone)', letterSpacing: '-0.02em' }}>
        Balance
      </h1>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(229,229,229,0.15)', borderTopColor: 'var(--color-bone)', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* Headline */}
          <div style={{ ...cardStyle, textAlign: 'center', padding: '32px 20px' }}>
            <p style={{ fontSize: '14px', color: 'var(--color-fog)', marginBottom: '10px' }}>{headline}</p>
            {Math.abs(net) >= 0.01 && (
              <p style={{ fontFamily: 'var(--font-geist)', fontSize: '36px', fontWeight: 500, color: toneColor }}>
                {formatCurrency(Math.abs(net))}
              </p>
            )}
            <p style={{ fontSize: '13px', color: 'var(--color-fog)', marginTop: '12px' }}>
              Based on evenly-split expenses this month
            </p>
          </div>

          {/* Breakdown */}
          <div style={cardStyle}>
            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-bone)', marginBottom: '16px' }}>This month's breakdown</p>
            {[you, partner].filter((r): r is BalanceRow => !!r).map((r, i) => (
              <div key={r.user_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0',
                borderTop: i === 0 ? 'none' : '1px solid rgba(229,229,229,0.06)',
              }}>
                <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-bone)' }}>
                  {r.user_id === user?.id ? 'You' : r.display_name}
                </span>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'var(--font-geist)', fontSize: '15px', color: 'var(--color-bone)' }}>
                    Paid {formatCurrency(r.paid)}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                    Share: {formatCurrency(r.owes)}
                  </p>
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <p style={{ fontSize: '14px', color: 'var(--color-fog)' }}>No evenly-split expenses logged this month yet.</p>
            )}
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
