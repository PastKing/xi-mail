// Display names that contain a different mailbox than the real sender fall back to the real address.
export function senderLabel(item) {
  const name = String(item?.name || '').trim();
  const address = String(item?.sendEmail || '').trim();
  const shown = name.match(/[^\s<>"'(),;:]+@[^\s<>"'(),;:]+/g) || [];
  if (shown.some(value => value.toLowerCase() !== address.toLowerCase())) return address || name;
  return name || address;
}
