import type { BaseName } from './types.js';
import { UnknownBaseError } from './errors.js';

/**
 * Character sets for common base encodings.
 *
 * Use these with `createCodec()` or the deprecated `BufferEncoder` class
 * when you need direct access to character sets.
 *
 * @example
 * ```typescript
 * import { Chars, createCodec } from 'bufferbase';
 *
 * const codec = createCodec(Chars.Base58);
 * const encoded = codec.encode(Buffer.from('Hello'));
 * ```
 */
export const Chars = {
  /** Base 10: 0-9 */
  Decimal: '0123456789',
  /** Hexadecimal: 0-9A-F */
  Base16: '0123456789ABCDEF',
  /** RFC 4648 Base32: A-Z2-7 */
  Base32: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
  /** Crockford's Base32: 0-9A-HJKMNP-TV-Z (no I, L, O, U) */
  Base32Crockford: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
  /** Alphanumeric: 0-9A-Z */
  Base36: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  /** Letters only: A-Za-z */
  Base52: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  /** Bitcoin alphabet: 1-9A-HJ-NP-Za-km-z (no 0, O, I, l) */
  Base58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  /** Standard Base64: A-Za-z0-9+/ */
  Base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  /** URL-safe Base64: A-Za-z0-9-_ */
  Base64Url: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
  /** XML token Base64: A-Za-z0-9._ */
  Base64Xml: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._',
  /** XML name Base64: A-Za-z0-9_: */
  Base64XmlName: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_:',
  /** ASCII85 encoding */
  Ascii85: '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstu',
  /** Base85 encoding */
  Base85: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+-;<=>?@^_`{|}~',
  /** ZeroMQ Z85 encoding */
  Z85: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#',
} as const;

/**
 * Internal mapping from base names to character sets.
 * @internal
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
 *
 * This function is used internally by the function API to convert
 * base names (like `'base58'`) to their character sets.
 *
 * @param base - Base name (e.g., `'base58'`) or custom character set string
 * @returns The character set string
 * @throws {UnknownBaseError} If base name is not recognized and string length <= 15
 *
 * @example
 * ```typescript
 * import { resolveChars } from 'bufferbase';
 *
 * resolveChars('base58'); // Returns Bitcoin alphabet
 * resolveChars('0123456789ABCDEF'); // Returns the string as-is (custom charset)
 * resolveChars('invalid'); // Throws UnknownBaseError
 * ```
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
 *
 * @param value - The string to check
 * @returns `true` if the value is a valid `BaseName`, `false` otherwise
 *
 * @example
 * ```typescript
 * import { isBaseName } from 'bufferbase';
 *
 * isBaseName('base58'); // true
 * isBaseName('BASE58'); // true (case-insensitive)
 * isBaseName('unknown'); // false
 * ```
 */
export function isBaseName(value: string): value is BaseName {
  return value.toLowerCase() in baseNameToChars;
}
