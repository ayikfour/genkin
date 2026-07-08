interface Props {
  currentStep: number
  totalSteps: number
}

// Same flex-row-of-blocks language as BudgetProgressBar, but a fixed
// segment count (always totalSteps, no responsive block-width math) and a
// neutral fill — bg-foreground/bg-muted, not --color-success/--color-danger,
// since those stay reserved for the budget-usage semantic elsewhere.
export function OnboardingStepIndicator({ currentStep, totalSteps }: Props) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className={`h-1.5 flex-1 ${i <= currentStep ? 'bg-foreground' : 'bg-muted'}`} />
      ))}
    </div>
  )
}
