import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import NumberFlow from '@number-flow/react'
import { Check, Copy } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useAppSound } from '../hooks/useAppSound'
import { getCurrency, DEFAULT_CURRENCY_CODE } from '../lib/currencies'
import { appendDigits, backspace, unitsToAmount } from '../lib/amountUnits'
import { toISODateLocal } from '../lib/dates'
import { friendlyJoinSpaceError } from '../lib/spaceErrors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { NumericKeypad } from '@/components/NumericKeypad'
import { OnboardingStepIndicator } from '@/components/OnboardingStepIndicator'
import { AuthBackground } from '@/components/AuthBackground'

type Step = 'name' | 'budget' | 'import' | 'invite'
const STEPS: Step[] = ['name', 'budget', 'import', 'invite']

// First-run walkthrough — see design.md's "Onboarding Walkthrough" pattern.
// Skippable at every step (budget/import) or a no-op default (invite ends
// solo if you do nothing) — never a forced gate, per the solo-by-default
// model this project deliberately moved to in 0b04650. Gated by
// AuthContext's needsOnboarding via ProtectedRoute, so this component only
// ever needs to worry about its own step progression, not who can see it.
export function OnboardingPage() {
  const navigate = useNavigate()
  const { user, space, refreshSpace, completeOnboarding } = useAuth()
  const playSound = useAppSound()
  const [searchParams, setSearchParams] = useSearchParams()

  const requestedStep = searchParams.get('step')
  const step: Step = (STEPS as string[]).includes(requestedStep ?? '') ? (requestedStep as Step) : 'name'
  const stepIndex = STEPS.indexOf(step)

  function goToStep(next: Step) {
    setSearchParams({ step: next })
  }

  // ---- Step 1: Name ----
  const [name, setName] = useState(space?.display_name ?? '')
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    setName(space?.display_name ?? '')
  }, [space?.display_name])

  async function handleNameContinue() {
    const trimmed = name.trim()
    if (space && user && trimmed && trimmed !== space.display_name) {
      setSavingName(true)
      await supabase
        .from('space_members')
        .update({ display_name: trimmed })
        .eq('space_id', space.space_id)
        .eq('user_id', user.id)
      await refreshSpace()
      setSavingName(false)
    }
    playSound('tap')
    goToStep('budget')
  }

  // ---- Step 2: Budget ----
  const currency = getCurrency(space?.currency_code ?? DEFAULT_CURRENCY_CODE)
  const [amountUnits, setAmountUnits] = useState('0')
  const [savingBudget, setSavingBudget] = useState(false)

  async function handleBudgetContinue() {
    const amount = unitsToAmount(amountUnits, currency.decimals)
    if (amount > 0 && user) {
      setSavingBudget(true)
      const currentMonth = toISODateLocal(new Date()).slice(0, 7)
      await supabase
        .from('budgets')
        .upsert(
          { user_id: user.id, monthly_amount: amount, effective_month: `${currentMonth}-01` },
          { onConflict: 'user_id,effective_month' },
        )
      setSavingBudget(false)
    }
    playSound('tap')
    goToStep('import')
  }

  // ---- Step 3: Import ----
  function handleImportCsv() {
    playSound('click')
    navigate('/import', { state: { from: 'onboarding' } })
  }

  function handleSkipImport() {
    playSound('click')
    goToStep('invite')
  }

  // ---- Step 4: Invite / Join / Solo ----
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinName, setJoinName] = useState(space?.display_name ?? '')
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    if (step !== 'invite' || !space) return
    supabase
      .from('spaces')
      .select('invite_code')
      .eq('id', space.space_id)
      .single()
      .then(({ data }) => setInviteCode(data?.invite_code ?? null))
  }, [step, space?.space_id])

  // Reactive, not a stale mount-time snapshot — if Step 1 already changed
  // the display name, the join card's prefill should reflect that.
  useEffect(() => {
    setJoinName(space?.display_name ?? '')
  }, [space?.display_name])

  async function copyCode() {
    if (!inviteCode) return
    await navigator.clipboard.writeText(inviteCode)
    playSound('copy')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleJoin() {
    if (!joinCode.trim() || !joinName.trim()) return
    setJoining(true)
    setJoinError('')
    const { error } = await supabase.rpc('join_space', {
      code: joinCode.trim().toUpperCase(),
      display_name: joinName.trim(),
    })
    setJoining(false)
    if (error) {
      playSound('error')
      setJoinError(friendlyJoinSpaceError(error.message))
      return
    }
    playSound('success')
    await refreshSpace()
    await completeOnboarding()
    toast('Switched spaces')
    navigate('/log')
  }

  async function handleFinish() {
    setFinishing(true)
    await completeOnboarding()
    setFinishing(false)
    playSound('success')
    navigate('/log')
  }

  return (
    <div
      className="relative isolate mx-auto flex min-h-screen max-w-lg flex-col p-6"
      style={{ paddingTop: 'calc(24px + var(--safe-top))', paddingBottom: 'calc(24px + var(--safe-bottom))' }}
    >
      <AuthBackground />
      <OnboardingStepIndicator currentStep={stepIndex} totalSteps={STEPS.length} />

      <div className="flex flex-1 flex-col pt-8">
        {step === 'name' && (
          <div className="flex flex-1 flex-col">
            <div className="space-y-5">
              <div>
                <h1 className="font-heading text-xl font-medium text-foreground">What should we call you?</h1>
                <p className="text-sm text-muted-foreground">Shown to anyone who joins your space.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="onboarding-name">Your name</Label>
                <Input
                  id="onboarding-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={32}
                  className="h-12"
                />
              </div>
            </div>
            <Button onClick={handleNameContinue} disabled={savingName || !name.trim()} className="mt-auto w-full">
              {savingName ? 'Saving…' : 'Continue'}
            </Button>
          </div>
        )}

        {step === 'budget' && (
          <div className="flex flex-1 flex-col">
            <div>
              <h1 className="font-heading text-xl font-medium text-foreground">Set a monthly budget</h1>
              <p className="text-sm text-muted-foreground">You can always set or change this later in Settings.</p>
            </div>
            <div className="flex flex-1 items-center justify-center gap-1">
              <span className="font-heading text-2xl font-medium text-muted-foreground">{currency.symbol}</span>
              <span className="font-heading text-5xl font-medium text-foreground">
                <NumberFlow
                  value={unitsToAmount(amountUnits, currency.decimals)}
                  locales={currency.locale}
                  format={{ minimumFractionDigits: currency.decimals, maximumFractionDigits: currency.decimals }}
                />
              </span>
            </div>
            <div className="space-y-5">
              <NumericKeypad
                onDigit={d => setAmountUnits(u => appendDigits(u, d))}
                onBackspace={() => setAmountUnits(u => backspace(u))}
              />
              <Button onClick={handleBudgetContinue} disabled={savingBudget} className="w-full">
                {savingBudget ? 'Saving…' : 'Continue'}
              </Button>
            </div>
          </div>
        )}

        {step === 'import' && (
          <div className="flex flex-1 flex-col">
            <div>
              <h1 className="font-heading text-xl font-medium text-foreground">Bring in your history</h1>
              <p className="text-sm text-muted-foreground">
                Already tracking expenses in a spreadsheet? Import them now.
              </p>
            </div>
            <div className="mt-auto space-y-5">
              <Card className="space-y-3 p-5">
                <p className="text-sm text-muted-foreground">Load expenses from a CSV export of your spreadsheet.</p>
                <Button onClick={handleImportCsv} className="w-full">
                  Import from CSV
                </Button>
              </Card>
              <button
                onClick={handleSkipImport}
                className="w-full text-center text-sm font-medium text-muted-foreground"
              >
                I'll do this later
              </button>
            </div>
          </div>
        )}

        {step === 'invite' && (
          <div className="flex flex-1 flex-col">
            <div className="space-y-5">
              <div>
                <h1 className="font-heading text-xl font-medium text-foreground">Add a partner anytime</h1>
                <p className="text-sm text-muted-foreground">
                  Your space is solo by default — invite someone whenever you're ready, or keep it just for you.
                </p>
              </div>

              <Card className="space-y-3 p-5">
                <p className="text-sm font-medium text-foreground">Your invite code</p>
                <div className="flex items-center justify-between">
                  <span className="font-heading text-lg font-medium tracking-[0.15em] text-foreground">
                    {inviteCode ?? '······'}
                  </span>
                  <button
                    onClick={copyCode}
                    disabled={!inviteCode}
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5" weight="bold" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" /> Copy
                      </>
                    )}
                  </button>
                </div>
              </Card>

              <Card className="space-y-3 p-5">
                <p className="text-sm font-medium text-foreground">Have a code already?</p>
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-join-code">Invite code</Label>
                  <Input
                    id="onboarding-join-code"
                    type="text"
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="h-12 font-heading tracking-[0.1em] uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="onboarding-join-name">Your name</Label>
                  <Input
                    id="onboarding-join-name"
                    type="text"
                    value={joinName}
                    onChange={e => setJoinName(e.target.value)}
                    maxLength={32}
                    className="h-12"
                  />
                </div>
                {joinError && <p className="text-xs leading-relaxed text-destructive">{joinError}</p>}
                <Button
                  onClick={handleJoin}
                  variant="secondary"
                  disabled={joining || !joinCode.trim() || !joinName.trim()}
                  className="w-full"
                >
                  {joining ? 'Joining…' : 'Join'}
                </Button>
              </Card>
            </div>

            <Button onClick={handleFinish} disabled={finishing} className="mt-auto w-full">
              {finishing ? 'Finishing…' : 'Finish'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
