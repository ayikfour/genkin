import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAppSound } from '@/hooks/useAppSound'
import { Button } from '@/components/ui/button'
import { TopNavMonthFilter } from '@/components/TopNavMonthFilter'

const NAV_CONFIG: Record<string, { title: string; mode: 'plain' | 'monthFilter'; back?: string }> = {
  '/log': { title: 'Logs', mode: 'monthFilter' },
  '/dashboard': { title: 'Stats', mode: 'monthFilter' },
  '/feed': { title: 'Activity', mode: 'plain' },
  '/settings': { title: 'Settings', mode: 'plain' },
  '/import': { title: 'Import expenses', mode: 'plain', back: '/settings' },
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
      <div className="relative mx-auto flex max-w-lg items-center px-5 py-3.5">
        {config.back && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="mr-2"
            onClick={() => { playSound('click'); navigate(config.back!) }}
          >
            <ArrowLeft />
          </Button>
        )}
        {config.mode === 'monthFilter' ? (
          <TopNavMonthFilter />
        ) : (
          <h1 className="font-heading text-lg font-medium tracking-tight text-foreground">
            {config.title}
          </h1>
        )}
      </div>
    </nav>
  )
}
