import {useSettingStore} from "@/store/setting.js";
export function formatPrivateImages(content, urls = {}) {
    if (!Object.keys(urls).length) return content || '';
    const doc = new DOMParser().parseFromString(content || '', 'text/html');
    for (const img of doc.querySelectorAll('img')) {
        const src=img.getAttribute('src') || '';
        let key=src.startsWith('{{domain}}')?src.slice(10):'';
        if (!key) {try {key=decodeURIComponent(new URL(src,location.origin).pathname).replace(/^\/(?:api\/oss\/)?/,'')} catch {}}
        if (Object.hasOwn(urls,key)) {
            img.setAttribute('src',urls[key]);
            img.setAttribute('data-xi-attachment-key',key);
        }
    }
    return /<!doctype|<html|<head/i.test(content || '') ? doc.documentElement.outerHTML : doc.head.innerHTML+doc.body.innerHTML;
}
export function cvtR2Url(key) {

    if (!key) {
        return + 'https://' + ''
    }

    if (key.startsWith('https://')) {
        return key
    }

    const { settings } = useSettingStore();

    let domain = settings.objectProxyBase || settings.r2Domain

    if (!domain) {
        return key;
    }

    if (!domain.startsWith('http')) {
        return 'https://' + domain + '/' + key
    }

    if (domain.endsWith("/")) {
        domain = domain.slice(0, -1);
    }
    return domain + '/' + key
}

export function toOssDomain(domain) {

    if (!domain) {
        return ''
    }

    if (!domain.startsWith('http')) {
        return 'https://' + domain
    }

    if (domain.endsWith("/")) {
        domain = domain.slice(0, -1);
    }

    return domain
}
