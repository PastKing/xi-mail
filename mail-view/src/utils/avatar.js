export function avatarHash(seed) {
  let hash = 2166136261;
  for (const char of String(seed)) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  return hash >>> 0;
}

export function createAvatar(seed) {
  let state = avatarHash(seed) || 1;
  const pick = values => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return values[(state >>> 0) % values.length];
  };
  return {
    background: pick(['#e6eee9','#e6eaf4','#eee6f2','#f5eadb','#e0eef0','#f4e4e4']),
    skin: pick(['#f5d0b5','#e9b997','#dba17d','#bd805b','#8f5f46']),
    hair: pick(['#333b47','#4b3430','#745040','#393b39','#a87546']),
    shirt: pick(['#547c73','#647caa','#9b708f','#b87958','#63798a','#8b8657']),
    hairstyle: pick([0,1,2,3]),
    smile: pick(['M27 41q5 4 10 0','M28 42q4 2 8 0','M28 41q4 5 8 0']),
    tilt: pick([-5,-3,0,3,5]),
  };
}
