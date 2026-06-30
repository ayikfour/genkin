import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Expense, Category, CoupleMember } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  expense?: Expense | null
  categories: Category[]
  members: CoupleMember[]
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  height: '48px',
  background: 'var(--color-ink)',
  border: '1px solid rgba(229,229,229,0.12)',
  borderRadius: 'var(--radius-input)',
  padding: '12px 16px',
  fontSize: '16px',
  color: 'var(--color-bone)',
  outline: 'none',
}

export function AddExpenseSheet({ isOpen, onClose, expense, categories, members }: Props) {
  const { user, couple } = useAuth()
  const isEdit = !!expense

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [paidBy, setPaidBy] = useState(user?.id ?? '')
  const [split, setSplit] = useState<'even' | 'payer_only'>('even')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    if (expense) {
      setAmount(String(expense.amount))
      setCategory(expense.category)
      setDescription(expense.description)
      setDate(expense.expense_date)
      setPaidBy(expense.paid_by)
      setSplit(expense.split)
    } else {
      setAmount('')
      setCategory(categories[0]?.name ?? '')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setPaidBy(user?.id ?? '')
      setSplit('even')
    }
    setError('')
    setSaving(false)
    setDeleting(false)
  }, [isOpen, expense?.id])

  async function handleSave() {
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) { setError('Enter a valid amount'); return }
    if (!category) { setError('Select a category'); return }
    setSaving(true); setError('')

    const payload = {
      couple_id: couple!.couple_id,
      paid_by: paidBy,
      logged_by: user!.id,
      amount: amt,
      category,
      description: description.trim(),
      expense_date: date,
      split,
    }

    const { error: err } = isEdit
      ? await supabase.from('expenses').update(payload).eq('id', expense!.id)
      : await supabase.from('expenses').insert(payload)

    if (err) { setError(err.message); setSaving(false) }
    else onClose()
  }

  async function handleDelete() {
    if (!expense) return
    setDeleting(true)
    await supabase.from('expenses').delete().eq('id', expense.id)
    onClose()
  }

  const partner = members.find(m => m.user_id !== user?.id)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(0,0,0,0.6)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 250ms ease',
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(20,20,20,0.96)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(229,229,229,0.08)',
          borderRadius: '24px 24px 0 0',
          maxHeight: '92vh',
          overflowY: 'auto',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 280ms ease',
          paddingBottom: 'calc(24px + var(--safe-bottom))',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '12px', paddingBottom: '4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '9999px', background: 'var(--color-iron)' }} />
        </div>

        <div style={{ padding: '8px 20px 0' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-bone)' }}>
              {isEdit ? 'Edit expense' : 'Add expense'}
            </h2>
            <button
              onClick={onClose}
              style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-fog)' }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 4l10 10M14 4L4 14" />
              </svg>
            </button>
          </div>

          {/* Amount */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--font-geist)',
                fontSize: '48px',
                fontWeight: 500,
                color: 'var(--color-bone)',
                textAlign: 'center',
                width: '100%',
              }}
            />
            <div style={{ width: '48px', height: '2px', background: 'rgba(229,229,229,0.15)', margin: '0 auto 4px' }} />
          </div>

          {/* Categories */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
              Category
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.name)}
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    borderRadius: '9999px',
                    border: category === cat.name ? '1px solid rgba(229,229,229,0.20)' : '1px solid rgba(229,229,229,0.08)',
                    background: category === cat.name ? 'var(--color-iron)' : 'var(--color-ink)',
                    color: category === cat.name ? 'var(--color-bone)' : 'var(--color-fog)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background 150ms, color 150ms',
                  }}
                >
                  <span style={{ fontSize: '15px' }}>{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
              Description
            </label>
            <input
              type="text"
              placeholder="e.g. Grab, Indomaret…"
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'rgba(229,229,229,0.30)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(229,229,229,0.12)')}
            />
          </div>

          {/* Date */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(229,229,229,0.30)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(229,229,229,0.12)')}
            />
          </div>

          {/* Who paid */}
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Who paid
            </p>
            <div style={{ display: 'flex', background: 'var(--color-ink)', borderRadius: '9999px', padding: '4px', gap: '4px' }}>
              {[
                { id: user?.id ?? '', label: 'You' },
                { id: partner?.user_id ?? '', label: partner?.display_name ?? 'Partner' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setPaidBy(opt.id)}
                  disabled={!opt.id}
                  style={{
                    flex: 1, height: '36px', borderRadius: '9999px',
                    background: paidBy === opt.id ? 'var(--color-iron)' : 'transparent',
                    color: paidBy === opt.id ? 'var(--color-bone)' : 'var(--color-fog)',
                    fontSize: '15px', fontWeight: paidBy === opt.id ? 500 : 400,
                    cursor: 'pointer', transition: 'background 150ms, color 150ms',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Split */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Split
            </p>
            <div style={{ display: 'flex', background: 'var(--color-ink)', borderRadius: '9999px', padding: '4px', gap: '4px' }}>
              {([['even', 'Split evenly'], ['payer_only', 'Paid alone']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSplit(val)}
                  style={{
                    flex: 1, height: '36px', borderRadius: '9999px',
                    background: split === val ? 'var(--color-iron)' : 'transparent',
                    color: split === val ? 'var(--color-bone)' : 'var(--color-fog)',
                    fontSize: '15px', fontWeight: split === val ? 500 : 400,
                    cursor: 'pointer', transition: 'background 150ms, color 150ms',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: 'var(--color-danger)', marginBottom: '12px' }}>{error}</p>
          )}

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              display: 'block', width: '100%', height: '48px',
              borderRadius: '9999px',
              background: saving ? 'rgba(255,255,255,0.6)' : 'var(--color-paper)',
              color: 'var(--color-onyx)', fontSize: '16px', fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer', marginBottom: '10px',
            }}
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add expense'}
          </button>

          {/* Delete (edit mode only) */}
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                display: 'block', width: '100%', height: '44px',
                borderRadius: '9999px', background: 'transparent',
                color: deleting ? 'rgba(248,113,113,0.5)' : 'var(--color-danger)',
                fontSize: '15px', fontWeight: 500, cursor: deleting ? 'not-allowed' : 'pointer',
              }}
            >
              {deleting ? 'Deleting…' : 'Delete expense'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
