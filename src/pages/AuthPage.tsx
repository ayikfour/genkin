import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

type State = 'idle' | 'loading' | 'sent' | 'error'

export function AuthPage() {
  const { session, couple } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  useEffect(() => {
    if (session) navigate(couple ? '/log' : '/onboarding', { replace: true })
  }, [session, couple, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setState('loading')
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    })
    if (err) {
      let msg = err.message ?? ''
      try { const p = JSON.parse(msg); msg = p.message ?? p.error ?? '' } catch { /* not JSON */ }
      setError(msg || 'Failed to send email. Check your address and try again.')
      setState('error')
    } else {
      setState('sent')
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setVerifying(true)
    setVerifyError('')
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    })
    if (err) {
      setVerifyError(err.message || 'Invalid or expired code. Check the digits and try again.')
      setVerifying(false)
    }
    // on success, AuthContext's session listener triggers the redirect effect above
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-void">
      <div className="w-full max-w-sm space-y-6">

        {/* Wordmark */}
        <div className="text-center space-y-1">
          <h1 style={{ fontFamily: 'var(--font-geist)', fontSize: '32px', fontWeight: 500, color: 'var(--color-bone)', letterSpacing: '-0.02em' }}>
            Calcula
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-fog)' }}>
            Shared expenses for two
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-card p-6 space-y-4">
          {state === 'sent' ? (
            <div className="text-center space-y-3 py-4">
              <div className="text-3xl">✉️</div>
              <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-bone)' }}>
                Check your email
              </p>
              <p style={{ fontSize: '14px', color: 'var(--color-mist)', lineHeight: 1.5 }}>
                We sent a magic link to{' '}
                <span style={{ color: 'var(--color-bone)' }}>{email}</span>.
                Tap it to sign in.
              </p>
              <button
                onClick={() => setState('idle')}
                style={{ fontSize: '14px', color: 'var(--color-fog)', marginTop: '8px' }}
              >
                Use a different email
              </button>

              {/* Hairline divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '8px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(229,229,229,0.10)' }} />
                <span style={{ fontSize: '13px', color: 'var(--color-fog)' }}>or enter the 6-digit code</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(229,229,229,0.10)' }} />
              </div>

              <form onSubmit={handleVerify} className="space-y-3" style={{ textAlign: 'left' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '48px',
                    background: 'var(--color-ink)',
                    border: '1px solid rgba(229,229,229,0.12)',
                    borderRadius: 'var(--radius-input)',
                    padding: '12px 16px',
                    fontFamily: 'var(--font-geist)',
                    fontSize: '24px',
                    fontWeight: 500,
                    letterSpacing: '0.3em',
                    textAlign: 'center',
                    color: 'var(--color-bone)',
                    outline: 'none',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(229,229,229,0.30)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(229,229,229,0.12)')}
                />

                {verifyError && (
                  <p style={{ fontSize: '13px', color: 'var(--color-danger)', textAlign: 'center' }}>{verifyError}</p>
                )}

                <button
                  type="submit"
                  disabled={verifying || code.length < 6}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '48px',
                    borderRadius: 'var(--radius-pill)',
                    background: verifying || code.length < 6 ? 'rgba(255,255,255,0.6)' : 'var(--color-paper)',
                    color: 'var(--color-onyx)',
                    fontSize: '16px',
                    fontWeight: 500,
                    cursor: verifying || code.length < 6 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {verifying ? 'Verifying…' : 'Verify code →'}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block space-y-1.5">
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Email
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  style={{
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
                  }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(229,229,229,0.30)')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(229,229,229,0.12)')}
                />
              </label>

              {error && (
                <p style={{ fontSize: '13px', color: 'var(--color-danger)' }}>{error}</p>
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
                {state === 'loading' ? 'Sending…' : 'Send magic link →'}
              </button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-fog)' }}>
          No password needed — just your email.
        </p>
      </div>
    </div>
  )
}
