import type { CodecSpec } from './types.js';
import { UnknownBaseError } from './errors.js';

/**
 * Character sets, ordered by value.
 *
 * A character set does not by itself describe an encoding — see `Bases` for
 * the alphabet/algorithm pairs that do.
 */
export const Chars = {
  /** Base 10: 0-9 */
  Decimal: '0123456789',
  /** RFC 4648 Table 5 — Base16: 0-9A-F */
  Base16: '0123456789ABCDEF',
  /** RFC 4648 Table 3 — Base32: A-Z2-7 */
  Base32: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
  /** RFC 4648 Table 4 — Base32 with extended hex alphabet: 0-9A-V */
  Base32Hex: '0123456789ABCDEFGHIJKLMNOPQRSTUV',
  /** Crockford's Base32: 0-9A-HJKMNP-TV-Z (no I, L, O, U) */
  Base32Crockford: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
  /** Alphanumeric: 0-9A-Z */
  Base36: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  /** Letters only: A-Za-z */
  Base52: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  /** Bitcoin alphabet: 1-9A-HJ-NP-Za-km-z (no 0, O, I, l) */
  Base58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  /** RFC 4648 Table 1 — Base64: A-Za-z0-9+/ */
  Base64: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  /** RFC 4648 Table 2 — URL-safe Base64: A-Za-z0-9-_ */
  Base64Url: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
  /** XML token Base64: A-Za-z0-9._ */
  Base64Xml: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._',
  /** XML name Base64: A-Za-z0-9_: */
  Base64XmlName: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_:',
  /** Ascii85: the 85 printable characters from `!` (0x21) to `u` (0x75) */
  Ascii85: '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu',
  /** ZeroMQ Z85 (RFC 32): avoids the quote and backslash characters */
  Z85: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#',
  /** The five symbols Crockford's Base32 adds for its check symbol, giving a modulus of 37 */
  CrockfordCheck: '*~$=U',
} as const;

/** The characters Crockford's Base32 reads as the digit they resemble. */
const CROCKFORD_ALIASES = { I: '1', L: '1', O: '0' } as const;

/**
 * The encodings this package knows by name.
 *
 * Each entry pairs an alphabet with the algorithm that reads it, because the
 * alphabet alone is ambiguous: `base64` and `radix64` share Table 1 but
 * produce different strings for the same bytes.
 *
 * @example
 * ```typescript
 * import { encode, Bases } from 'bufferbase';
 *
 * encode(Buffer.from('fo'), 'base64');  // 'Zm8='  — RFC 4648
 * encode(Buffer.from('fo'), 'radix64'); // 'GZv'   — radix conversion
 * ```
 */
export const Bases = {
  // Radix conversion. No external standard fixes these, so nothing here can
  // disagree with one.
  decimal: { alphabet: Chars.Decimal, algorithm: 'radix' },
  base36: { alphabet: Chars.Base36, algorithm: 'radix', caseInsensitive: true },
  base52: { alphabet: Chars.Base52, algorithm: 'radix' },
  base58: { alphabet: Chars.Base58, algorithm: 'radix' },
  /**
   * Crockford's Base32, which specifies a notation for numbers rather than for
   * byte streams, so a radix conversion is the right reading of it.
   *
   * Decoding accepts either case, reads `I` and `L` as `1` and `O` as `0`, and
   * ignores hyphens.
   */
  base32crockford: {
    alphabet: Chars.Base32Crockford,
    algorithm: 'radix',
    caseInsensitive: true,
    aliases: CROCKFORD_ALIASES,
    ignore: '-',
  },
  /** Crockford's Base32 carrying its trailing check symbol. */
  base32crockfordcheck: {
    alphabet: Chars.Base32Crockford,
    algorithm: 'radix',
    caseInsensitive: true,
    aliases: CROCKFORD_ALIASES,
    ignore: '-',
    checkSymbols: Chars.CrockfordCheck,
  },

  // Bit-block encoding, RFC 4648.
  base16: { alphabet: Chars.Base16, algorithm: 'block', pad: false, caseInsensitive: true },
  hex: { alphabet: Chars.Base16, algorithm: 'block', pad: false, caseInsensitive: true },
  base32: { alphabet: Chars.Base32, algorithm: 'block', caseInsensitive: true },
  base32hex: { alphabet: Chars.Base32Hex, algorithm: 'block', caseInsensitive: true },
  base64: { alphabet: Chars.Base64, algorithm: 'block' },
  /** Unpadded, as used by JWT and other URL-facing formats. */
  base64url: { alphabet: Chars.Base64Url, algorithm: 'block', pad: false },
  base64xml: { alphabet: Chars.Base64Xml, algorithm: 'block', pad: false },
  base64xmlname: { alphabet: Chars.Base64XmlName, algorithm: 'block', pad: false },

  // Four bytes to five characters.
  /** Ascii85 with the zero-block shortcut, matching Python's `a85encode`. */
  ascii85: { alphabet: Chars.Ascii85, algorithm: 'block85', zeroShortcut: true },
  /** ZeroMQ Z85, which has no padding and so encodes whole blocks only. */
  z85: { alphabet: Chars.Z85, algorithm: 'block85', requireFullBlocks: true },

  // Radix conversion over the RFC alphabets.
  radix16: { alphabet: Chars.Base16, algorithm: 'radix' },
  radix32: { alphabet: Chars.Base32, algorithm: 'radix' },
  radix64: { alphabet: Chars.Base64, algorithm: 'radix' },
  radix64url: { alphabet: Chars.Base64Url, algorithm: 'radix' },
} as const satisfies Record<string, CodecSpec>;

/**
 * The names accepted wherever a base is expected.
 */
export type BaseName = keyof typeof Bases;

/**
 * Resolves a base name to its codec spec, and passes a spec through unchanged.
 *
 * @throws {UnknownBaseError} If the name is not one of `Bases`
 */
export function resolveSpec(base: BaseName | CodecSpec): CodecSpec {
  if (typeof base !== 'string') {
    return base;
  }
  const spec: CodecSpec | undefined = Bases[base.toLowerCase() as BaseName];
  if (spec === undefined) {
    throw new UnknownBaseError(base);
  }
  return spec;
}

/**
 * Checks whether a string names one of the encodings in `Bases`.
 */
export function isBaseName(value: string): value is BaseName {
  return value.toLowerCase() in Bases;
}
