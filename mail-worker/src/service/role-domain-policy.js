// Existing whitelist CSV remains readable; blacklist policies are versioned JSON
// in the same column so every domain-enforcement path uses a single policy.
export function readRoleDomainPolicy(value) {
  if (Array.isArray(value)) return { mode: 'whitelist', domains: value, valid: true };
  const text = String(value || '').trim();
  if (text.startsWith('{') || text.startsWith('[')) {
    try {
      const policy = JSON.parse(text);
      if (policy.version !== 1 || policy.mode !== 'blacklist' || !Array.isArray(policy.domains)
        || !policy.domains.every(domain => typeof domain === 'string' && validDomain(domain)))
        return { valid: false, domains: [], mode: 'blacklist' };
      return { ...policy, valid: true };
    } catch { return { valid: false, domains: [], mode: 'blacklist' }; }
  }
  return { mode: 'whitelist', domains: text.split(',').map(item => item.trim()).filter(Boolean), valid: true };
}

function validDomain(domain) {
  return domain.length <= 253 && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]*[a-z0-9])?$/i.test(domain);
}

export function writeRoleDomainPolicy(domains = [], mode = 'whitelist') {
  if (!['whitelist', 'blacklist'].includes(mode) || !Array.isArray(domains) || domains.length > 1000)
    throw new Error('Invalid role domain policy');
  const normalized = [...new Set(domains.map(domain => {
    if (typeof domain !== 'string') throw new Error('Invalid domain');
    const value = domain.trim().replace(/^@/, '').toLowerCase();
    if (!validDomain(value)) throw new Error('Invalid domain');
    return value;
  }))];
  return mode === 'blacklist'
    ? JSON.stringify({ version: 1, mode, domains: normalized })
    : normalized.join(',');
}

export function allowsRoleDomain(policyValue, email) {
  const policy = readRoleDomainPolicy(policyValue);
  if (!policy.valid || typeof email !== 'string' || !email.includes('@')) return false;
  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
  const found = policy.domains.some(item => item.replace(/^@/, '').toLowerCase() === domain);
  return policy.mode === 'blacklist' ? !found : !policy.domains.length || found;
}
