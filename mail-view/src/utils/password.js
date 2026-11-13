const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*+-_'];
const alphabet = groups.join('');

function randomIndex(length) {
  const byte = new Uint8Array(1);
  const limit = 256 - 256 % length;
  do { crypto.getRandomValues(byte); } while (byte[0] >= limit);
  return byte[0] % length;
}

export function isStrongPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 64 && !/\s/.test(password)
    && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
}

export function createRandomPassword() {
  const characters = groups.map(group => group[randomIndex(group.length)]);
  while (characters.length < 16) characters.push(alphabet[randomIndex(alphabet.length)]);
  for (let index = characters.length - 1; index > 0; index--) {
    const other = randomIndex(index + 1);
    [characters[index], characters[other]] = [characters[other], characters[index]];
  }
  return characters.join('');
}
