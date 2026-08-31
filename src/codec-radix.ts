import type { BufferLike, DecodeOptions, RadixSpec } from './types.js';
import { BaseCodec } from './codec-base.js';
import {
  BufferSizeError,
  CheckSymbolError,
  InvalidCharacterError,
  InvalidCodecError,
  InvalidLengthError,
} from './errors.js';

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
 * separately as leading `alphabet[0]` characters.
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

  /** Alphabet plus the extra check symbols, or `null` when unchecked. */
  private readonly checkChars: string | null;

  /** Value of every character a check symbol may be written as. */
  private readonly checkValues: ReadonlyMap<string, number>;

  constructor(spec: RadixSpec) {
    super(spec);

    const extra = spec.checkSymbols;
    if (extra === undefined || extra === '') {
      this.checkChars = null;
      this.checkValues = new Map();
      return;
    }
    const combined = spec.alphabet + extra;
    if (new Set(combined).size !== combined.length) {
      throw new InvalidCodecError('checkSymbols repeat a character of the alphabet');
    }

    // The symbol is matched by value, so that a case-insensitive codec accepts
    // it in either case just as it does the rest of the string.
    const values = new Map<string, number>();
    for (let i = 0; i < combined.length; i++) {
      const char = combined[i];
      values.set(char, i);
      if (spec.caseInsensitive === true) {
        values.set(char.toLowerCase(), i);
        values.set(char.toUpperCase(), i);
      }
    }
    this.checkChars = combined;
    this.checkValues = values;
  }

  encode(buffer: BufferLike): string {
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
    if (this.checkChars !== null) {
      out += this.checkChars[this.remainderOf(buffer, this.checkChars.length)];
    }
    return out;
  }

  decode(encoded: string, options?: DecodeOptions): Uint8Array {
    const bytes = this.read(this.strip(encoded));

    const size = options?.size;
    if (size === undefined) {
      return Uint8Array.from(bytes);
    }
    if (bytes.length > size) {
      throw new BufferSizeError(bytes.length, size);
    }
    const padded = new Uint8Array(size);
    padded.set(bytes, size - bytes.length);
    return padded;
  }

  validate(input: string): boolean {
    const stripped = this.strip(input);
    if (this.checkChars === null) {
      // Every string over the alphabet decodes, so the characters settle it.
      for (let i = 0; i < stripped.length; i++) {
        if (this.valueAt(stripped, i) < 0) {
          return false;
        }
      }
      return true;
    }
    try {
      this.read(stripped);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Decodes the body, verifying the check symbol when the codec carries one.
   *
   * Everything `decode` can reject other than `DecodeOptions.size` is checked
   * here, so `validate` and `decode` always agree.
   */
  private read(input: string): number[] {
    let body = input;

    if (this.checkChars !== null) {
      if (body.length === 0) {
        throw new InvalidLengthError(0, 'a checked encoding always carries a check symbol');
      }
      const found = body.slice(-1);
      body = body.slice(0, -1);
      const bytes = this.toBytes(body);
      const expected = this.remainderOf(bytes, this.checkChars.length);
      if (this.checkValues.get(found) !== expected) {
        throw new CheckSymbolError(found, this.checkChars[expected]);
      }
      return bytes;
    }
    return this.toBytes(input);
  }

  /** Rewrites the digits of `body` as bytes, most significant first. */
  private toBytes(body: string): number[] {
    const base = this.chars.length;
    const bytes: number[] = [];
    let leadingZeros = 0;
    let stillLeading = true;

    for (let at = 0; at < body.length; at++) {
      const value = this.valueAt(body, at);
      if (value < 0) {
        throw new InvalidCharacterError(body[at]);
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
    return bytes;
  }

  /** The value the bytes denote, modulo `divisor`. */
  private remainderOf(bytes: Iterable<number>, divisor: number): number {
    let remainder = 0;
    for (const byte of bytes) {
      remainder = (remainder * 256 + byte) % divisor;
    }
    return remainder;
  }
}
