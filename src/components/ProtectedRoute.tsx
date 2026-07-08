import { Navigate, useLocation } from 'react-router-dom'
import { SpinnerGap } from '@phosphor-icons/react'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, space, loading, needsOnboarding } = useAuth()
  const location = useLocation()

  if (loading || (session && !space)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <SpinnerGap className="size-6 animate-spin text-muted-foreground" weight="bold" />
      </div>
    )
  }

  if (!session) return <Navigate to="/auth" replace />

  // /import is reachable mid-onboarding (the walkthrough's Import step
  // hands off to it and expects to navigate back to /onboarding itself) —
  // exempt it from the redirect below alongside /onboarding itself. It's
  // otherwise only reachable from Settings, which is unreachable while
  // needsOnboarding is true, so this doesn't open a back door around the
  // walkthrough for any other route.
  const onboardingExempt = location.pathname === '/onboarding' || location.pathname === '/import'
  if (needsOnboarding && !onboardingExempt) return <Navigate to="/onboarding" replace />
  if (!needsOnboarding && location.pathname === '/onboarding') return <Navigate to="/log" replace />

  return <>{children}</>
}
