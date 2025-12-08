import { Buffer } from 'node:buffer';
import type { ICodec, DecodeOptions } from './types.js';
import { InvalidCharacterError, BufferSizeError } from './errors.js';

/**
 * Codec for encoding and decoding buffers to/from a specific base.
 */
export class Codec implements ICodec {
  readonly chars: string;
  private readonly charToIndex: Map<string, number>;

  constructor(chars: string) {
    this.chars = chars;
    this.charToIndex = new Map();
    for (let i = 0; i < chars.length; i++) {
      this.charToIndex.set(chars[i], i);
    }
  }

  /**
   * Encodes a buffer to a base-encoded string.
   */
  encode(buffer: Buffer): string {
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
   */
  convertTo(target: ICodec, input: string): string {
    const buffer = this.decode(input);
    return target.encode(buffer);
  }
}

/**
 * Creates a new codec with the specified character set.
 */
export function createCodec(chars: string): Codec {
  return new Codec(chars);
}
