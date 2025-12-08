import { Buffer } from 'node:buffer';
import type { ICodec, DecodeOptions, BufferLike } from './types.js';
import { InvalidCharacterError, BufferSizeError } from './errors.js';

/**
 * Converts a BufferLike (Buffer or Uint8Array) to a Buffer.
 * @internal
 */
function toBuffer(input: BufferLike): Buffer {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  return Buffer.from(input);
}

/**
 * Codec for encoding and decoding buffers to/from a specific base.
 *
 * Use pre-defined codecs from `Codecs` for common encodings,
 * or create custom codecs with `createCodec()`.
 *
 * @example
 * ```typescript
 * import { Codec, Codecs, createCodec } from 'bufferbase';
 *
 * // Use pre-defined codec
 * const encoded = Codecs.base58.encode(Buffer.from('Hello'));
 *
 * // Create custom codec
 * const binary = createCodec('01');
 * const bits = binary.encode(Buffer.from([5])); // '101'
 * ```
 */
export class Codec implements ICodec {
  /** Character set used for encoding. */
  readonly chars: string;

  /** @internal */
  private readonly charToIndex: Map<string, number>;

  /**
   * Creates a new codec with the specified character set.
   * @param chars - The character set to use for encoding/decoding
   */
  constructor(chars: string) {
    this.chars = chars;
    this.charToIndex = new Map();
    for (let i = 0; i < chars.length; i++) {
      this.charToIndex.set(chars[i], i);
    }
  }

  /**
   * Encodes a buffer to a base-encoded string.
   *
   * Leading zero bytes in the buffer are preserved as the first character
   * of the encoding alphabet (e.g., '1' for Base58).
   *
   * @param input - The buffer or Uint8Array to encode
   * @returns Base-encoded string
   *
   * @example
   * ```typescript
   * const codec = Codecs.base58;
   * codec.encode(Buffer.from('Hello')); // '9Ajdvzr'
   * codec.encode(new Uint8Array([0, 0, 1])); // '112' (preserves leading zeros)
   * ```
   */
  encode(input: BufferLike): string {
    const buffer = toBuffer(input);
    if (buffer.length === 0) {
      return '';
    }

    const base = this.chars.length;
    const result: number[] = [];

    // Count leading zeros
    let leadingZeros = 0;
    for (const byte of buffer) {
      if (byte === 0) {
        leadingZeros++;
      } else {
        break;
      }
    }

    // Convert to base
    for (const byte of buffer) {
      let carry = byte;
      for (let j = 0; j < result.length; j++) {
        carry += result[j] * 256;
        result[j] = carry % base;
        carry = Math.floor(carry / base);
      }
      while (carry > 0) {
        result.push(carry % base);
        carry = Math.floor(carry / base);
      }
    }

    // Add leading zeros
    for (let i = 0; i < leadingZeros; i++) {
      result.push(0);
    }

    // Reverse and convert to string
    return result
      .reverse()
      .map((index) => this.chars[index])
      .join('');
  }

  /**
   * Decodes a base-encoded string to a buffer.
   *
   * Leading characters that represent zero (first char of alphabet)
   * are converted to leading zero bytes in the result.
   *
   * @param encoded - The string to decode
   * @param options - Decode options
   * @returns Decoded buffer
   * @throws {InvalidCharacterError} If the string contains invalid characters
   * @throws {BufferSizeError} If the result exceeds the specified size
   *
   * @example
   * ```typescript
   * const codec = Codecs.base58;
   * codec.decode('9Ajdvzr'); // Buffer('Hello')
   * codec.decode('9Ajdvzr', { size: 32 }); // Pads to 32 bytes
   * ```
   */
  decode(encoded: string, options?: DecodeOptions): Buffer {
    if (encoded.length === 0) {
      if (options?.size !== undefined && options.size > 0) {
        return Buffer.alloc(options.size);
      }
      return Buffer.alloc(0);
    }

    const base = this.chars.length;
    const zeroChar = this.chars[0];

    // Count leading zeros in encoded string
    let leadingZeros = 0;
    for (const char of encoded) {
      if (char === zeroChar) {
        leadingZeros++;
      } else {
        break;
      }
    }

    // Convert from base
    const result: number[] = [];
    for (const char of encoded) {
      const value = this.charToIndex.get(char);
      if (value === undefined) {
        throw new InvalidCharacterError(char);
      }

      let carry = value;
      for (let i = 0; i < result.length; i++) {
        carry += result[i] * base;
        result[i] = carry % 256;
        carry = Math.floor(carry / 256);
      }
      while (carry > 0) {
        result.push(carry % 256);
        carry = Math.floor(carry / 256);
      }
    }

    // Add leading zeros
    for (let i = 0; i < leadingZeros; i++) {
      result.push(0);
    }

    result.reverse();

    // Handle size option
    const size = options?.size;
    if (size !== undefined) {
      if (result.length > size) {
        throw new BufferSizeError(result.length, size);
      }
      if (result.length < size) {
        // Pad with leading zeros
        const padded = new Array(size - result.length).fill(0).concat(result);
        return Buffer.from(padded);
      }
    }

    return Buffer.from(result);
  }

  /**
   * Validates if a string contains only valid characters for this base.
   *
   * This is a fast check that doesn't perform full decoding.
   *
   * @param input - The string to validate
   * @returns `true` if all characters are valid, `false` otherwise
   *
   * @example
   * ```typescript
   * Codecs.base58.validate('9Ajdvzr'); // true
   * Codecs.base58.validate('0invalid'); // false ('0' not in Base58)
   * ```
   */
  validate(input: string): boolean {
    for (const char of input) {
      if (!this.charToIndex.has(char)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Converts a string from this base to another base.
   *
   * Internally decodes to a buffer, then encodes with the target codec.
   *
   * @param target - Target codec to convert to
   * @param input - The string to convert
   * @returns String in the target base encoding
   * @throws {InvalidCharacterError} If the input contains invalid characters
   *
   * @example
   * ```typescript
   * const base58str = '9Ajdvzr';
   * const base64str = Codecs.base58.convertTo(Codecs.base64url, base58str);
   * ```
   */
  convertTo(target: ICodec, input: string): string {
    const buffer = this.decode(input);
    return target.encode(buffer);
  }
}

/**
 * Creates a new codec with the specified character set.
 *
 * Use this to create codecs for custom base encodings.
 * The base is determined by the length of the character set.
 *
 * @param chars - The character set to use for encoding/decoding
 * @returns A new Codec instance
 *
 * @example
 * ```typescript
 * import { createCodec } from 'bufferbase';
 *
 * // Binary codec (base 2)
 * const binary = createCodec('01');
 * binary.encode(Buffer.from([5])); // '101'
 *
 * // Octal codec (base 8)
 * const octal = createCodec('01234567');
 * octal.encode(Buffer.from([255])); // '377'
 * ```
 */
export function createCodec(chars: string): Codec {
  return new Codec(chars);
}
