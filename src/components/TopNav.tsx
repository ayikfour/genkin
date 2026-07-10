import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAppSound } from '@/hooks/useAppSound'
import { Button } from '@/components/ui/button'

const NAV_CONFIG: Record<string, { title: string; back?: string; hideGear?: boolean }> = {
  '/log': { title: 'Logs' },
  '/dashboard': { title: 'Stats', back: '/log' },
  '/feed': { title: 'Feed', back: '/log' },
  '/settings': { title: 'Settings', back: '/log', hideGear: true },
  '/import': { title: 'Import expenses', back: '/settings', hideGear: true },
}

export function TopNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const playSound = useAppSound()
  const config = NAV_CONFIG[pathname] ?? NAV_CONFIG['/log']
  const [scrolled, setScrolled] = useState(() => window.scrollY > 0)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [pathname])

  return (
    <nav
      className="fixed top-0 right-0 left-0 z-50"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      <div
        className={cn(
          'absolute inset-0 border-b border-border bg-background/80 backdrop-blur-md transition-opacity duration-300',
          scrolled ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div className="relative mx-auto flex max-w-lg items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2">
          {config.back && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => { playSound('click'); navigate(config.back!) }}
            >
              <ArrowLeft />
            </Button>
          )}
          <h1 className="font-heading text-lg font-medium tracking-tight text-foreground">
            {config.title}
          </h1>
        </div>
        {!config.hideGear && (
          <Button variant="ghost" size="icon-sm" onClick={() => { playSound('click'); navigate('/settings') }}>
            <SlidersHorizontal />
          </Button>
        )}
      </div>
    </nav>
  )
}
