import { useState, useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useExpenses } from '../hooks/useExpenses'
import { useCategories } from '../hooks/useCategories'
import { useCoupleMembers } from '../hooks/useCoupleMembers'
import { AddExpenseSheet } from '../components/AddExpenseSheet'
import type { Expense } from '../types'

function formatDateHeader(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function LogPage() {
  const { user, couple } = useAuth()
  const { expenses, loading } = useExpenses(couple?.couple_id)
  const categories = useCategories()
  const members = useCoupleMembers(couple?.couple_id)

  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterPaidBy, setFilterPaidBy] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  const partner = members.find(m => m.user_id !== user?.id)

  const filtered = useMemo(() => {
    let result = expenses
    if (filterCategory) result = result.filter(e => e.category === filterCategory)
    if (filterPaidBy) result = result.filter(e => e.paid_by === filterPaidBy)
    return result
  }, [expenses, filterCategory, filterPaidBy])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of filtered) {
      const list = map.get(e.expense_date) ?? []
      list.push(e)
      map.set(e.expense_date, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [filtered])

  function openAdd() { setEditingExpense(null); setSheetOpen(true) }
  function openEdit(e: Expense) { setEditingExpense(e); setSheetOpen(true) }
  function closeSheet() { setSheetOpen(false); setEditingExpense(null) }

  const catIcons = Object.fromEntries(categories.map(c => [c.name, c.icon]))

  return (
    <>
      <div style={{ paddingBottom: '8px' }}>

        {/* Header */}
        <div style={{ padding: '8px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 500, color: 'var(--color-bone)', letterSpacing: '-0.02em' }}>
            Expenses
          </h1>
          <span style={{ fontSize: '14px', color: 'var(--color-fog)' }}>
            {expenses.length} total
          </span>
        </div>

        {/* Filter bar */}
        <div style={{ overflowX: 'auto', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '12px', display: 'flex', gap: '8px', scrollbarWidth: 'none' }}>
          {/* Payer filters */}
          {[
            { label: 'All', value: null as string | null },
            { label: 'You', value: user?.id ?? null },
            ...(partner ? [{ label: partner.display_name, value: partner.user_id }] : []),
          ].map(opt => (
            <button
              key={opt.label}
              onClick={() => setFilterPaidBy(opt.value)}
              style={{
                flexShrink: 0,
                height: '32px', padding: '0 14px', borderRadius: '9999px',
                background: filterPaidBy === opt.value ? 'var(--color-iron)' : 'var(--color-char)',
                border: filterPaidBy === opt.value ? '1px solid rgba(229,229,229,0.20)' : '1px solid rgba(229,229,229,0.10)',
                color: filterPaidBy === opt.value ? 'var(--color-bone)' : 'var(--color-fog)',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'background 150ms, color 150ms',
              }}
            >
              {opt.label}
            </button>
          ))}

          {/* Divider */}
          <div style={{ width: '1px', background: 'rgba(229,229,229,0.08)', flexShrink: 0, margin: '4px 2px' }} />

          {/* Category filters */}
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(filterCategory === cat.name ? null : cat.name)}
              style={{
                flexShrink: 0,
                height: '32px', padding: '0 12px', borderRadius: '9999px',
                background: filterCategory === cat.name ? 'var(--color-iron)' : 'var(--color-char)',
                border: filterCategory === cat.name ? '1px solid rgba(229,229,229,0.20)' : '1px solid rgba(229,229,229,0.10)',
                color: filterCategory === cat.name ? 'var(--color-bone)' : 'var(--color-fog)',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px',
                whiteSpace: 'nowrap', transition: 'background 150ms, color 150ms',
              }}
            >
              <span>{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '60px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(229,229,229,0.15)', borderTopColor: 'var(--color-bone)', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : grouped.length === 0 ? (
          /* Empty state */
          <div style={{ textAlign: 'center', padding: '64px 32px 32px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🧾</div>
            <p style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-bone)', marginBottom: '8px' }}>
              {filterCategory || filterPaidBy ? 'No matching expenses' : 'No expenses yet'}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-fog)', marginBottom: '24px', lineHeight: 1.5 }}>
              {filterCategory || filterPaidBy ? 'Try a different filter.' : 'Tap + to log your first expense.'}
            </p>
            {!filterCategory && !filterPaidBy && (
              <button
                onClick={openAdd}
                style={{
                  height: '48px', padding: '0 28px', borderRadius: '9999px',
                  background: 'var(--color-paper)', color: 'var(--color-onyx)',
                  fontSize: '16px', fontWeight: 500, cursor: 'pointer',
                }}
              >
                Add expense →
              </button>
            )}
          </div>
        ) : (
          /* Expense list grouped by date */
          <div>
            {grouped.map(([date, items]) => (
              <div key={date}>
                {/* Date header */}
                <div style={{ padding: '12px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {formatDateHeader(date)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-geist)', fontSize: '13px', color: 'var(--color-fog)' }}>
                    {items.reduce((s, e) => s + e.amount, 0).toFixed(2)}
                  </span>
                </div>

                {/* Rows */}
                <div style={{ marginBottom: '4px' }}>
                  {items.map((expense, i) => {
                    const payer = members.find(m => m.user_id === expense.paid_by)
                    const payerLabel = expense.paid_by === user?.id ? 'You' : (payer?.display_name ?? 'Partner')
                    const splitLabel = expense.split === 'even' ? 'Split' : 'Solo'

                    return (
                      <button
                        key={expense.id}
                        onClick={() => openEdit(expense)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          width: '100%', padding: '14px 20px',
                          background: 'transparent', cursor: 'pointer', textAlign: 'left',
                          borderTop: i === 0 ? '1px solid rgba(229,229,229,0.06)' : 'none',
                          borderBottom: '1px solid rgba(229,229,229,0.06)',
                        }}
                      >
                        {/* Category icon */}
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '8px',
                          background: 'var(--color-ink)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', flexShrink: 0,
                        }}>
                          {catIcons[expense.category] ?? '📦'}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-bone)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {expense.description || expense.category}
                          </p>
                          <p style={{ fontSize: '13px', color: 'var(--color-fog)' }}>
                            {payerLabel} · {splitLabel}
                          </p>
                        </div>

                        {/* Amount */}
                        <span style={{ fontFamily: 'var(--font-geist)', fontSize: '16px', fontWeight: 500, color: 'var(--color-bone)', flexShrink: 0 }}>
                          {expense.amount.toFixed(2)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openAdd}
        style={{
          position: 'fixed', bottom: 'calc(80px + var(--safe-bottom))', right: '20px', zIndex: 30,
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'var(--color-paper)', color: 'var(--color-onyx)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          cursor: 'pointer',
          fontSize: '28px', fontWeight: 300, lineHeight: 1,
        }}
        aria-label="Add expense"
      >
        +
      </button>

      {/* Spinner keyframes */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <AddExpenseSheet
        isOpen={sheetOpen}
        onClose={closeSheet}
        expense={editingExpense}
        categories={categories}
        members={members}
      />
    </>
  )
}
