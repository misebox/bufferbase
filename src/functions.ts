import type { BaseName, DecodeOptions, BufferLike } from './types.js';
import { Codec } from './codec.js';
import { resolveChars } from './bases.js';

// Cache for codec instances
const codecCache = new Map<string, Codec>();

/**
 * Gets or creates a codec for the specified base.
 */
function getCodec(base: BaseName | string): Codec {
  const chars = resolveChars(base);
  let codec = codecCache.get(chars);
  if (!codec) {
    codec = new Codec(chars);
    codecCache.set(chars, codec);
  }
  return codec;
}

/**
 * Encodes a buffer to a base-encoded string.
 *
 * @param buffer - Buffer or Uint8Array to encode
 * @param base - Base name (e.g., 'base58') or custom character set
 * @returns Encoded string
 *
 * @example
 * ```typescript
 * // Node.js Buffer
 * const encoded = encode(Buffer.from('Hello'), 'base58');
 *
 * // Browser Uint8Array
 * const encoded = encode(new Uint8Array([72, 101, 108, 108, 111]), 'base58');
 * ```
 */
export function encode(buffer: BufferLike, base: BaseName | string): string {
  return getCodec(base).encode(buffer);
}

/**
 * Decodes a base-encoded string to a buffer.
 *
 * @param encoded - String to decode
 * @param base - Base name (e.g., 'base58') or custom character set
 * @param options - Decode options (e.g., { size: 32 })
 * @returns Decoded buffer
 *
 * @example
 * ```typescript
 * const buffer = decode('9Ajdvz', 'base58');
 * const fixedSize = decode('9Ajdvz', 'base58', { size: 32 });
 * ```
 */
export function decode(encoded: string, base: BaseName | string, options?: DecodeOptions): Buffer {
  return getCodec(base).decode(encoded, options);
}

/**
 * Converts a string from one base to another.
 *
 * @param input - String to convert
 * @param from - Source base name or character set
 * @param to - Target base name or character set
 * @returns Converted string
 *
 * @example
 * ```typescript
 * const base64 = convert('9Ajdvz', 'base58', 'base64url');
 * ```
 */
export function convert(input: string, from: BaseName | string, to: BaseName | string): string {
  const fromCodec = getCodec(from);
  const toCodec = getCodec(to);
  return fromCodec.convertTo(toCodec, input);
}

/**
 * Validates if a string contains only valid characters for the specified base.
 *
 * @param input - String to validate
 * @param base - Base name or character set
 * @returns true if valid, false otherwise
 *
 * @example
 * ```typescript
 * validate('9Ajdvz', 'base58'); // true
 * validate('0Ajdvz', 'base58'); // false ('0' is not in base58)
 * ```
 */
export function validate(input: string, base: BaseName | string): boolean {
  return getCodec(base).validate(input);
}
