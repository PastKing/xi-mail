import DOMPurify from 'dompurify'

// Sanitize at render time so old stored messages receive the same protection.
export const EMAIL_CSP = "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src https: http: data: blob:; font-src https: data:; media-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'"

export function emailDocument(html) {
  const clean = DOMPurify.sanitize(String(html || ''), {
    WHOLE_DOCUMENT: true,
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['script', 'base', 'meta', 'link', 'iframe', 'frame', 'frameset', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'option', 'video', 'audio', 'source', 'svg', 'math', 'template'],
    FORBID_ATTR: ['srcdoc', 'ping', 'autofocus', 'autoplay', 'download'],
    ALLOW_DATA_ATTR: false,
  })
  const doc = new DOMParser().parseFromString(clean, 'text/html')
  const policy = doc.createElement('meta')
  policy.httpEquiv = 'Content-Security-Policy'
  policy.content = EMAIL_CSP
  doc.head.prepend(policy)
  const referrer = doc.createElement('meta')
  referrer.name = 'referrer'
  referrer.content = 'no-referrer'
  doc.head.append(referrer)
  const defaults = doc.createElement('style')
  defaults.textContent = 'html{background:#fff;color:#13181d}body{margin:0;font:14px/1.5 -apple-system,Inter,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow-wrap:break-word}p{margin:0}h1,h2,h3,h4{font-size:18px;font-weight:700}a{color:#0e70df;text-decoration:none}img{max-width:100%;height:auto}'
  doc.head.insertBefore(defaults, policy.nextSibling)
  for (const link of doc.querySelectorAll('a')) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }
  return '<!doctype html>' + doc.documentElement.outerHTML
}

export function emailPreviewText(html) {
  const fragment = DOMPurify.sanitize(String(html || ''), {
    ALLOWED_TAGS: [], ALLOWED_ATTR: [], RETURN_DOM_FRAGMENT: true,
    FORBID_CONTENTS: ['script', 'style', 'title', 'svg', 'math'],
  })
  return fragment.textContent || ''
}
