import { useAuth } from '../hooks/useAuth'

export function SettingsPage() {
  const { user, couple, signOut } = useAuth()

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-heading-sm font-medium text-bone">Settings</h1>

      <div className="glass rounded-card p-5 space-y-3">
        <p className="text-caption text-fog uppercase tracking-widest">Account</p>
        <p className="text-body text-bone">{user?.email}</p>
        {couple && (
          <p className="text-body text-mist">
            Playing as <span className="text-bone font-medium">{couple.display_name}</span>
          </p>
        )}
      </div>

      <button
        onClick={signOut}
        className="w-full py-3 rounded-pill bg-iron text-bone text-body font-medium hover:bg-slate transition-colors"
      >
        Sign out
      </button>
    </div>
  )
}
