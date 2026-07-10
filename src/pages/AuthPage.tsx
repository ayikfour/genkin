import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { PasswordAuthForm } from '../components/PasswordAuthForm'
import { MagicLinkAuthForm } from '../components/MagicLinkAuthForm'
import { AuthBackground } from '../components/AuthBackground'

type View = 'magic' | 'password'

export function AuthPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('magic')
  const [email, setEmail] = useState('')
  const [suppressRedirect, setSuppressRedirect] = useState(false)

  useEffect(() => {
    if (session && !suppressRedirect) navigate('/log', { replace: true })
  }, [session, navigate, suppressRedirect])

  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-end p-6 pb-10">
      <AuthBackground />

      <div className="w-full max-w-sm space-y-6">

        {/* Wordmark */}
        <div className="space-y-1 text-center">
          <h1 className="font-heading text-3xl font-medium tracking-tight text-foreground">
            Genkin
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your spending, share when you want
          </p>
        </div>

        {/* Card */}
        <div className="space-y-4 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          {view === 'magic' ? (
            <MagicLinkAuthForm
              initialEmail={email}
              onUsePassword={emailTyped => { setEmail(emailTyped); setView('password') }}
            />
          ) : (
            <PasswordAuthForm
              initialEmail={email}
              onUseMagicLink={emailTyped => { setEmail(emailTyped); setView('magic') }}
              onSuppressRedirectChange={setSuppressRedirect}
            />
          )}
        </div>
      </div>
    </div>
  )
}
