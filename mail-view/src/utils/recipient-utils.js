import { isEmail } from './verify-utils.js';

export function parseRecipientText(text, existing = []) {
  // Accept copied mailbox lists, including display names such as "张三 <a@example.com>".
  const tokens = text
    .replace(/(^|[,，;；\s])\s*(?:"[^"]*"\s*|[^@,，;；<>\r\n\t]*)<([^<>]+)>/g, '$1 $2 ')
    .split(/[,，;；\s]+/u)
    .filter(Boolean);
  const seen = new Set(existing.map(email => email.toLowerCase()));
  const emails = [];
  const invalid = [];
  for (const token of tokens) {
    const email = token.replace(/^mailto:/i, '');
    if (!isEmail(email)) {
      invalid.push(token);
    } else if (!seen.has(email.toLowerCase())) {
      emails.push(email);
      seen.add(email.toLowerCase());
    }
  }
  return { emails, invalid };
}
