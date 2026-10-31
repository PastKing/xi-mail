export function availableAccountDomains(domainList, user) {
  if (user?.type === 0) return domainList;
  if (!user?.role) return [];

  const allowed = (user.role.availDomain || '').split(',').filter(Boolean).map(domain => domain.toLowerCase());
  if (allowed.length === 0) return domainList;
  return domainList.filter(domain => allowed.includes(domain.replace(/^@/, '').toLowerCase()));
}
