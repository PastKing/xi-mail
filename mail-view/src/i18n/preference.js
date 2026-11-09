function locale(value) {
  if(typeof value!=='string'||!value.trim())return null;
  try{return new Intl.Locale(value.trim());}catch{return null;}
}

// Match enabled locales rather than the full translation directory. In
// particular, Chinese script variants must not be confused with each other.
export function matchLanguage(requested,supported) {
  const input=locale(requested);if(!input)return null;
  const candidates=supported.map(item=>({item,locale:locale(item.serviceId||item.id)})).filter(item=>item.locale);
  const exact=candidates.find(({item,locale:target})=>item.id.toLowerCase()===requested.toLowerCase()||target.toString()===input.toString());
  if(exact)return exact.item.id;
  const same=candidates.filter(({locale:target})=>target.language===input.language);
  if(!same.length)return null;
  const script=input.maximize().script;
  const compatible=same.filter(({locale:target})=>target.maximize().script===script);
  if(!compatible.length)return null;
  const region=compatible.find(({locale:target})=>target.region&&target.region===input.region);
  return (region||compatible.find(({locale:target})=>!target.region)||compatible[0]).item.id;
}

export function initialLanguage({account='',stored='',browser=[],supported=[]}) {
  for(const value of [account,stored]){const match=matchLanguage(value,supported);if(match)return match;}
  if(account||stored)return 'zh';
  for(const value of browser){const match=matchLanguage(value,supported);if(match)return match;}
  return 'zh';
}
