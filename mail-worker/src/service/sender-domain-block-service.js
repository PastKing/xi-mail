import settingService from './setting-service';
import BizError from '../error/biz-error';
import {t} from '../i18n/i18n';

export function normalizeBlockedDomain(input) {
  if(typeof input!=='string')throw new BizError(t('senderDomainInvalid'),400);
  let domain=input.trim().toLowerCase().replace(/^@/,'').replace(/\.$/,'');
  if(!domain||/[\s/:?#@]/.test(domain))throw new BizError(t('senderDomainInvalid'),400);
  try{domain=new URL('https://'+domain).hostname;}catch{throw new BizError(t('senderDomainInvalid'),400);}
  if(domain.length>253||!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]*[a-z0-9])?$/i.test(domain))throw new BizError(t('senderDomainInvalid'),400);
  return domain;
}

export async function blockSenderDomain(c,input) {
  const domain=normalizeBlockedDomain(input);
  for(let retry=0;retry<8;retry++){
    const row=await c.env.db.prepare('SELECT rowid AS rowId,sender_domain_blacklist AS blacklist,sender_filter_mode AS mode FROM setting LIMIT 1').first();
    if(!row)throw new BizError(t('senderDomainSettingsUnavailable'),503);
    if(Number(row.mode||0)!==0)throw new BizError(t('senderDomainWhitelistActive'),409);
    const list=String(row.blacklist||'').split(',').map(value=>value.trim()).filter(Boolean);
    const blocked=list.some(value=>{const rule=value.toLowerCase().replace(/^@/,'');return domain===rule||domain.endsWith('.'+rule)});
    if(blocked){await settingService.refresh(c);return{domain,alreadyBlocked:true,senderDomainBlacklist:list,senderFilterMode:0};}
    if(list.length>=5000)throw new BizError(t('senderDomainListLimit'),400);
    const saved=[...list,domain];
    const result=await c.env.db.prepare(`UPDATE setting SET sender_domain_blacklist=?
      WHERE rowid=? AND coalesce(sender_domain_blacklist,'')=? AND coalesce(sender_filter_mode,0)=0
      RETURNING sender_domain_blacklist`).bind(saved.join(','),row.rowId,String(row.blacklist||'')).first();
    if(result){await settingService.refresh(c);return{domain,alreadyBlocked:false,senderDomainBlacklist:saved,senderFilterMode:0};}
  }
  throw new BizError(t('senderDomainConflict'),409);
}
