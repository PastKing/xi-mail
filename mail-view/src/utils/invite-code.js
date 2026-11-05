export function generateInviteCode(length = 24) {
  // 32 symbols, 120 random bits by default; avoids Math.random and case-folding loss.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(length)), byte => alphabet[byte % alphabet.length]).join('')
}
