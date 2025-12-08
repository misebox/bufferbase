import type { BaseName } from './types.js';
import { UnknownBaseError } from './errors.js';

/**
 * Character sets for common base encodings.
 */
export const Chars = {
  Decimal: '0123456789',
  Base16: '0123456789ABCDEF',
  Base32: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
  Base32Crockford: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
  Base36: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  Base52: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  Base58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  Base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  Base64Url: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
  Base64Xml: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._',
  Base64XmlName: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_:',
  Ascii85: '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstu',
  Base85: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+-;<=>?@^_`{|}~',
  Z85: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#',
} as const;

/**
 * Mapping from base names to character sets.
 */
const baseNameToChars: Record<BaseName, string> = {
  decimal: Chars.Decimal,
  base16: Chars.Base16,
  hex: Chars.Base16,
  base32: Chars.Base32,
  base32crockford: Chars.Base32Crockford,
  base36: Chars.Base36,
  base52: Chars.Base52,
  base58: Chars.Base58,
  base64: Chars.Base64,
  base64url: Chars.Base64Url,
  base64xml: Chars.Base64Xml,
  base64xmlname: Chars.Base64XmlName,
  ascii85: Chars.Ascii85,
  base85: Chars.Base85,
  z85: Chars.Z85,
};

/**
 * Resolves a base name or character set string to a character set.
 * @param base - Base name or custom character set
 * @returns Character set string
 * @throws UnknownBaseError if base name is not recognized and string length <= 15
 */
export function resolveChars(base: BaseName | string): string {
  const normalized = base.toLowerCase() as BaseName;
  if (normalized in baseNameToChars) {
    return baseNameToChars[normalized];
  }
  // If not a known base name, treat as custom character set
  // (must be longer than 15 chars to distinguish from typos)
  if (base.length > 15) {
    return base;
  }
  throw new UnknownBaseError(base);
}

/**
 * Checks if a string is a valid base name.
 */
export function isBaseName(value: string): value is BaseName {
  return value.toLowerCase() in baseNameToChars;
}
