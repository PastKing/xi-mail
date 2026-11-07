// Canonical template catalog, consumed by both the API and frontend.
export const LOGIN_TEMPLATES = Object.freeze([
  { id: 'minimal', label: 'templateMinimal' },
  { id: 'editorial', label: 'templateEditorial' },
  { id: 'window', label: 'templateWindow' },
  { id: 'grid', label: 'templateGrid' },
  { id: 'envelope', label: 'templateEnvelope' },
  { id: 'passport', label: 'templatePassport' },
])

const ids = new Set(LOGIN_TEMPLATES.map(template => template.id))
const aliases = Object.freeze({
  gradient: 'editorial', split: 'editorial',
  glassmorphism: 'window', aurora: 'window',
  geometric: 'grid', terminal: 'minimal',
})

export function normalizeLoginTemplate(value) {
  if (ids.has(value)) return value
  return typeof value === 'string' && Object.hasOwn(aliases, value) ? aliases[value] : 'minimal'
}
