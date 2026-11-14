export function availableAccountDomains(domainList, user) {
  if (user?.type === 0) return domainList;
  if (!user?.role) return [];

  const policyValue = user.role.availDomain || '';
  let domains = Array.isArray(policyValue) ? policyValue : String(policyValue).trim();
  let mode = 'whitelist';
  if (typeof domains === 'string' && /^[{\[]/.test(domains)) {
    try {
      const policy = JSON.parse(domains);
      if (policy.version !== 1 || policy.mode !== 'blacklist' || !Array.isArray(policy.domains)
        || !policy.domains.every(domain => typeof domain === 'string' && domain.length <= 253
          && /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]*[a-z0-9])?$/i.test(domain))) return [];
      domains = policy.domains;
      mode = policy.mode;
    } catch {
      return [];
    }
  }
  if (typeof domains === 'string') domains = domains.split(',').map(domain => domain.trim()).filter(Boolean);
  const selected = domains.map(domain => domain.replace(/^@/, '').toLowerCase());
  return domainList.filter(domain => {
    const found = selected.includes(domain.replace(/^@/, '').toLowerCase());
    return mode === 'blacklist' ? !found : selected.length === 0 || found;
  });
}
