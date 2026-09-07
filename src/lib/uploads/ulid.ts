import { randomBytes } from 'node:crypto';

/**
 * A 26-character Crockford-base32 identifier: 48-bit timestamp then 80 bits of
 * randomness. Used as the upload handle so it sorts by creation time and is
 * safe in a URL, without pulling in a dependency for thirty lines of code.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function encode(value: bigint, length: number): string {
  let out = '';
  let remaining = value;
  for (let i = 0; i < length; i += 1) {
    out = ALPHABET[Number(remaining % 32n)] + out;
    remaining /= 32n;
  }
  return out;
}

export function ulid(now: number = Date.now()): string {
  const time = encode(BigInt(now), 10);
  const random = encode(BigInt(`0x${randomBytes(10).toString('hex')}`), 16);
  return time + random;
}
