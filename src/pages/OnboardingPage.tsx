import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type Mode = 'create' | 'join'
type State = 'idle' | 'loading' | 'created' | 'error'

export function OnboardingPage() {
  const { session, couple, refreshCouple } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('create')
  const [displayName, setDisplayName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState('')
  const [createdCode, setCreatedCode] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!session) navigate('/auth', { replace: true })
    if (couple) navigate('/log', { replace: true })
  }, [session, couple, navigate])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) return
    setState('loading')
    setError('')
    const { data, error: err } = await supabase.rpc('create_couple', {
      couple_name: `${displayName.trim()}'s couple`,
      display_name: displayName.trim(),
    })
    if (err) {
      setError(err.message)
      setState('error')
      return
    }
    // Fetch the invite code for the newly created couple
    const { data: coupleData } = await supabase
      .from('couples')
      .select('invite_code')
      .eq('id', data)
      .single()
    setCreatedCode(coupleData?.invite_code ?? '')
    await refreshCouple()
    setState('created')
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim() || !inviteCode.trim()) return
    setState('loading')
    setError('')
    const { error: err } = await supabase.rpc('join_couple', {
      code: inviteCode.trim().toUpperCase(),
      display_name: displayName.trim(),
    })
    if (err) {
      const msg = err.message.includes('invalid_invite_code')
        ? 'Invite code not found. Double-check it with your partner.'
        : err.message.includes('couple_full')
        ? 'This couple already has two members.'
        : err.message
      setError(msg)
      setState('error')
      return
    }
    await refreshCouple()
    navigate('/log', { replace: true })
  }

  async function copyCode() {
    await navigator.clipboard.writeText(createdCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--color-fog)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '6px',
  }

  // ── Created state: show invite code ───────────────────────
  if (state === 'created') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-void">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-1">
            <h1 style={{ fontFamily: 'var(--font-geist)', fontSize: '32px', fontWeight: 500, color: 'var(--color-bone)', letterSpacing: '-0.02em' }}>
              You're in!
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--color-fog)' }}>
              Share this code with your partner
            </p>
          </div>

          <div className="glass rounded-card p-6 space-y-5">
            <div
              style={{
                background: 'var(--color-ink)',
                borderRadius: 'var(--radius-input)',
                padding: '20px',
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-geist)',
                  fontSize: '28px',
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  color: 'var(--color-bone)',
                }}
              >
                {createdCode}
              </p>
              <button
                onClick={copyCode}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '10px',
                  fontSize: '12px',
                  color: copied ? 'var(--color-success)' : 'var(--color-fog)',
                  transition: 'color 150ms',
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--color-mist)', lineHeight: 1.6, textAlign: 'center' }}>
              Your partner opens the app, taps <strong style={{ color: 'var(--color-bone)' }}>Join a couple</strong>, and enters this code.
            </p>

            <button
              onClick={() => navigate('/log', { replace: true })}
              style={{
                display: 'block',
                width: '100%',
                height: '48px',
                borderRadius: 'var(--radius-pill)',
                background: 'var(--color-paper)',
                color: 'var(--color-onyx)',
                fontSize: '16px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Go to the app →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main onboarding form ───────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-void">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 style={{ fontFamily: 'var(--font-geist)', fontSize: '32px', fontWeight: 500, color: 'var(--color-bone)', letterSpacing: '-0.02em' }}>
            Set up your couple
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-fog)' }}>
            Two people, one shared expense log
          </p>
        </div>

        <div className="glass rounded-card p-6 space-y-5">
          {/* Mode switcher */}
          <div
            style={{
              display: 'flex',
              background: 'var(--color-ink)',
              borderRadius: 'var(--radius-pill)',
              padding: '4px',
              gap: '4px',
            }}
          >
            {(['create', 'join'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                style={{
                  flex: 1,
                  height: '36px',
                  borderRadius: 'var(--radius-pill)',
                  background: mode === m ? 'var(--color-iron)' : 'transparent',
                  color: mode === m ? 'var(--color-bone)' : 'var(--color-fog)',
                  fontSize: '15px',
                  fontWeight: mode === m ? 500 : 400,
                  transition: 'background 150ms, color 150ms',
                  cursor: 'pointer',
                }}
              >
                {m === 'create' ? 'Create' : 'Join'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={mode === 'create' ? handleCreate : handleJoin} className="space-y-4">
            {mode === 'join' && (
              <label className="block">
                <span style={labelStyle}>Invite code</span>
                <input
                  type="text"
                  placeholder="ABC123"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  style={{ ...inputStyle, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-geist)' }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(229,229,229,0.30)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(229,229,229,0.12)')}
                />
              </label>
            )}

            <label className="block">
              <span style={labelStyle}>Your name</span>
              <input
                type="text"
                placeholder="How your partner sees you"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={32}
                required
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(229,229,229,0.30)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(229,229,229,0.12)')}
              />
            </label>

            {error && (
              <p style={{ fontSize: '13px', color: 'var(--color-danger)', lineHeight: 1.5 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={state === 'loading'}
              style={{
                display: 'block',
                width: '100%',
                height: '48px',
                borderRadius: 'var(--radius-pill)',
                background: state === 'loading' ? 'rgba(255,255,255,0.6)' : 'var(--color-paper)',
                color: 'var(--color-onyx)',
                fontSize: '16px',
                fontWeight: 500,
                cursor: state === 'loading' ? 'not-allowed' : 'pointer',
                transition: 'opacity 150ms',
              }}
            >
              {state === 'loading'
                ? 'Working…'
                : mode === 'create'
                ? 'Create couple →'
                : 'Join couple →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
