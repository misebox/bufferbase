import type { Bytes, CodecSpec, DecodeOptions } from './types.js';
import { resolveSpec, type BaseName } from './bases.js';
import { getCodec } from './codec.js';

/** A named encoding, or a spec describing one directly. */
export type Base = BaseName | CodecSpec;

/**
 * Encodes a buffer to a base-encoded string.
 *
 * @param buffer - Buffer or Uint8Array to encode
 * @param base - Base name (e.g. `'base58'`) or a codec spec
 *
 * @example
 * ```typescript
 * encode(Buffer.from('fo'), 'base64');                        // 'Zm8='
 * encode(Uint8Array.of(5), { alphabet: '01', algorithm: 'radix' }); // '101'
 * ```
 */
export function encode(buffer: Bytes, base: Base): string {
  return getCodec(resolveSpec(base)).encode(buffer);
}

/**
 * Decodes a base-encoded string to a buffer.
 *
 * @param encoded - String to decode
 * @param base - Base name (e.g. `'base58'`) or a codec spec
 * @param options - Decode options, such as a required `size`
 * @throws {InvalidCharacterError} If a character is not in the alphabet
 * @throws {InvalidLengthError} If the length cannot encode a whole number of bytes
 * @throws {NonCanonicalError} If spare bits are set and the codec is strict
 * @throws {BufferSizeError} If the result does not have the requested `size`
 *
 * @example
 * ```typescript
 * decode('Zm8=', 'base64');              // Buffer('fo')
 * decode('9Ajdvzr', 'base58', { size: 32 });
 * ```
 */
export function decode(encoded: string, base: Base, options?: DecodeOptions): Uint8Array {
  return getCodec(resolveSpec(base)).decode(encoded, options);
}

/**
 * Converts a string from one base to another, through the bytes they describe.
 *
 * @example
 * ```typescript
 * convert('9Ajdvzr', 'base58', 'base64url');
 * convert(legacy, 'radix64', 'base64'); // migrate data written by bufferbase 2
 * ```
 */
export function convert(input: string, from: Base, to: Base): string {
  const source = getCodec(resolveSpec(from));
  const target = getCodec(resolveSpec(to));
  return source.convertTo(target, input);
}

/**
 * Reports whether `decode` would succeed for this input.
 *
 * @example
 * ```typescript
 * validate('Zm8=', 'base64');  // true
 * validate('Zm9=', 'base64');  // false — spare bits are not zero
 * validate('Zm9vd', 'base64'); // false — 5 characters cannot be whole bytes
 * ```
 */
export function validate(input: string, base: Base): boolean {
  return getCodec(resolveSpec(base)).validate(input);
}
