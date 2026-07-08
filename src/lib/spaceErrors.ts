// Friendly-message mapping for join_space() RPC failures — shared by
// SwitchSpaceSheet (Settings) and OnboardingPage's join card, so the three
// error strings raised by 0014_spaces_ownership_model.sql's join_space()
// aren't duplicated in two places.
export function friendlyJoinSpaceError(message: string): string {
  if (message.includes('invalid_invite_code')) return 'Invite code not found. Double-check it with your partner.'
  if (message.includes('space_full')) return 'This space already has two members.'
  if (message.includes('already_in_this_space')) return "You're already in this space."
  return message
}
