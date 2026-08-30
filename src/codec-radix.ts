import { Buffer } from 'node:buffer';
import type { BufferLike, DecodeOptions, RadixSpec } from './types.js';
import { BaseCodec, toBuffer } from './codec-base.js';
import { BufferSizeError, InvalidCharacterError } from './errors.js';

/**
 * Reads the buffer as one big integer and rewrites it in base
 * `alphabet.length`.
 *
 * This is the Base58 family of encodings. It accepts any alphabet and any
 * input length, but it is not RFC 4648: the output length is not a fixed
 * function of the input length, so it cannot be streamed, and encoding is
 * O(n²) in the input size.
 *
 * Leading zero bytes carry no value in an integer, so they are recorded
 * separately as leading `alphabet[0]` characters. Every string over the
 * alphabet decodes to exactly one buffer, so nothing is non-canonical and
 * `strict` has no effect here.
 *
 * @example
 * ```typescript
 * import { RadixCodec } from 'bufferbase';
 *
 * const binary = new RadixCodec({ alphabet: '01', algorithm: 'radix' });
 * binary.encode(Uint8Array.of(5)); // '101'
 * ```
 */
export class RadixCodec extends BaseCodec {
  readonly algorithm = 'radix' as const;

  constructor(spec: RadixSpec) {
    super(spec);
  }

  encode(input: BufferLike): string {
    const buffer = toBuffer(input);
    if (buffer.length === 0) {
      return '';
    }

    const base = this.chars.length;
    const digits: number[] = [];

    for (const byte of buffer) {
      let carry = byte;
      for (let i = 0; i < digits.length; i++) {
        carry += digits[i] * 256;
        digits[i] = carry % base;
        carry = Math.floor(carry / base);
      }
      while (carry > 0) {
        digits.push(carry % base);
        carry = Math.floor(carry / base);
      }
    }

    for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
      digits.push(0);
    }

    let out = '';
    for (let i = digits.length - 1; i >= 0; i--) {
      out += this.chars[digits[i]];
    }
    return out;
  }

  decode(encoded: string, options?: DecodeOptions): Buffer {
    const base = this.chars.length;
    const bytes: number[] = [];
    let leadingZeros = 0;
    let stillLeading = true;

    for (const char of encoded) {
      const value = this.valueOf(char);
      if (value === undefined) {
        throw new InvalidCharacterError(char);
      }
      if (stillLeading && value === 0) {
        leadingZeros++;
        continue;
      }
      stillLeading = false;

      let carry = value;
      for (let i = 0; i < bytes.length; i++) {
        carry += bytes[i] * base;
        bytes[i] = carry % 256;
        carry = Math.floor(carry / 256);
      }
      while (carry > 0) {
        bytes.push(carry % 256);
        carry = Math.floor(carry / 256);
      }
    }

    for (let i = 0; i < leadingZeros; i++) {
      bytes.push(0);
    }
    bytes.reverse();

    const size = options?.size;
    if (size === undefined) {
      return Buffer.from(bytes);
    }
    if (bytes.length > size) {
      throw new BufferSizeError(bytes.length, size);
    }
    const padded = Buffer.alloc(size);
    Buffer.from(bytes).copy(padded, size - bytes.length);
    return padded;
  }

  /**
   * Every string over the alphabet decodes, so this is a character check.
   */
  validate(input: string): boolean {
    for (const char of input) {
      if (this.valueOf(char) === undefined) {
        return false;
      }
    }
    return true;
  }
}
