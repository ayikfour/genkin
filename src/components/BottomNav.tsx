import { NavLink } from 'react-router-dom'

const tabs = [
  {
    to: '/log',
    label: 'Log',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h12M4 10h12M4 14h8" />
      </svg>
    ),
  },
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="4" height="6" rx="1" />
        <rect x="8" y="7" width="4" height="10" rx="1" />
        <rect x="13" y="3" width="4" height="14" rx="1" />
      </svg>
    ),
  },
  {
    to: '/balance',
    label: 'Balance',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3v14M5 7l5-4 5 4M5 13l5 4 5-4" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="2.5" />
        <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 glass"
      style={{ paddingBottom: 'calc(12px + var(--safe-bottom))' }}
    >
      <div className="flex items-center justify-around max-w-sm mx-auto px-4 pt-3">
        {tabs.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'flex flex-col items-center gap-1 px-3 py-1 rounded-full transition-colors duration-150',
                isActive ? 'text-bone' : 'text-fog hover:text-mist',
              ].join(' ')
            }
          >
            {icon}
            <span style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.025em' }}>
              {label}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
