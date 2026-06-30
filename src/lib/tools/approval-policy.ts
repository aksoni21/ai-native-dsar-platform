// Approval-phrase enforcement for side-effecting execution.
//
// Keep this small and boring: the execution pipeline imports this module
// before any email boundary can be crossed.
const APPROVAL_PHRASE_RE = /^\s*i\s+approve\s+(this\s+action|these\s+actions)\s*[.!]?\s*$/i;

export function isValidApprovalPhrase(quote: string): boolean {
  if (!quote || typeof quote !== 'string') return false;
  return APPROVAL_PHRASE_RE.test(quote);
}
