import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, couple, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-void">
        <div className="w-6 h-6 rounded-full border-2 border-bone/20 border-t-bone animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/auth" replace />
  if (!couple) return <Navigate to="/onboarding" replace />

  return <>{children}</>
}
