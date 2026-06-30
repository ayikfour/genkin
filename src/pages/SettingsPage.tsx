import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export function SettingsPage() {
  const { user, couple, signOut } = useAuth()
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!couple) return
    supabase
      .from('couples')
      .select('invite_code')
      .eq('id', couple.couple_id)
      .single()
      .then(({ data }) => setInviteCode(data?.invite_code ?? null))
  }, [couple?.couple_id])

  async function copyCode() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 space-y-5">
      <h1 style={{ fontSize: '32px', fontWeight: 500, color: 'var(--color-bone)', letterSpacing: '-0.02em' }}>
        Settings
      </h1>

      {/* Account */}
      <div className="glass rounded-card p-5 space-y-2">
        <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Account
        </p>
        <p style={{ fontSize: '16px', color: 'var(--color-bone)' }}>{user?.email}</p>
        {couple && (
          <p style={{ fontSize: '14px', color: 'var(--color-mist)' }}>
            Signed in as <span style={{ color: 'var(--color-bone)', fontWeight: 500 }}>{couple.display_name}</span>
          </p>
        )}
      </div>

      {/* Invite code */}
      {couple && (
        <div className="glass rounded-card p-5 space-y-3">
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Couple invite code
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-mist)', lineHeight: 1.5 }}>
            Share this with your partner so they can join your shared log.
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-ink)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-geist)',
                fontSize: '22px',
                fontWeight: 500,
                letterSpacing: '0.15em',
                color: 'var(--color-bone)',
              }}
            >
              {inviteCode ?? '······'}
            </span>
            <button
              onClick={copyCode}
              disabled={!inviteCode}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: copied ? 'var(--color-success)' : 'var(--color-ash)',
                transition: 'color 150ms',
                paddingLeft: '12px',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={signOut}
        style={{
          display: 'block',
          width: '100%',
          height: '48px',
          borderRadius: 'var(--radius-pill)',
          background: 'var(--color-iron)',
          color: 'var(--color-bone)',
          fontSize: '16px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => ((e.target as HTMLButtonElement).style.background = 'var(--color-slate)')}
        onMouseLeave={e => ((e.target as HTMLButtonElement).style.background = 'var(--color-iron)')}
      >
        Sign out
      </button>
    </div>
  )
}
