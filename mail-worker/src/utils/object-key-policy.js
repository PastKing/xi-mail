// Logical file keys are separate from KV configuration, credentials and sessions.
export function isObjectKey(key) {
  if (typeof key !== 'string' || key.length > 512 || /[\x00-\x1f\x7f\\]/.test(key)) return false;
  const match = /^(?:attachments|static(?:\/background)?)\/([^/]+)$/.exec(key);
  return !!match && match[1] !== '.' && match[1] !== '..';
}
