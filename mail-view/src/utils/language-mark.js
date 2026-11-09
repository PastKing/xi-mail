import {icons as flags} from '@iconify-json/circle-flags';

// A language may use a regional or language flag. Never request a guessed SVG
// URL: all lookups are against the icon library bundled with the application.
export function languageMark(language) {
  let locale;
  try { locale = new Intl.Locale(language?.serviceId || language?.id); } catch {}
  const id = String(language?.serviceId || language?.id || '').toLowerCase();
  const candidates = [language?.flag, locale?.region?.toLowerCase(), `lang-${id}`,
    locale?.language === 'tlh' ? 'klingon' : null,
    locale?.script ? locale.maximize().region?.toLowerCase() : null,
    `lang-${locale?.language}`, locale?.maximize().region?.toLowerCase()];
  const key = candidates.find(value => value && flags.icons[value]);
  return key ? {key, icon: {...flags.icons[key], width: flags.width, height: flags.height}} : null;
}
