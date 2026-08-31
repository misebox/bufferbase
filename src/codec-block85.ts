import type { Block85Spec, BufferLike, DecodeOptions } from './types.js';
import { BaseCodec } from './codec-base.js';
import {
  BufferSizeError,
  InvalidCharacterError,
  InvalidCodecError,
  InvalidLengthError,
  NonCanonicalError,
  ValueRangeError,
} from './errors.js';

const BYTES_PER_BLOCK = 4;
const CHARS_PER_BLOCK = 5;
const BLOCK_LIMIT = 0x1_00_00_00_00;
const ZERO_CHAR = 'z';
const ZERO_CODE = ZERO_CHAR.charCodeAt(0);
const SPACE_CHAR = 'y';
const SPACE_CODE = SPACE_CHAR.charCodeAt(0);
const SPACE_BLOCK = 0x20202020;
const OPEN = '<~';
const CLOSE = '~>';

/**
 * Converts each 4-byte block to 5 characters, the Ascii85 and Z85 family.
 *
 * 85^5 is the smallest power of 85 above 2^32, so five characters are enough
 * for four bytes and the expansion is 25% instead of Base64's 33%.
 *
 * Several mutually incompatible encodings share this algorithm and alphabet,
 * differing only in the shortcuts and framing they add. They are options here
 * rather than separate codecs: the btoa form is `zeroShortcut` plus
 * `spaceShortcut`, and the Adobe form is `zeroShortcut` plus `delimiters`. The
 * default, `zeroShortcut` alone, matches Python's `base64.a85encode`.
 *
 * @example
 * ```typescript
 * import { Codecs } from 'bufferbase';
 *
 * Codecs.ascii85.encode(Buffer.from('Man ')); // '9jqo^'
 * Codecs.ascii85.encode(Buffer.alloc(4));     // 'z'
 * ```
 */
export class Block85Codec extends BaseCodec {
  readonly algorithm = 'block85' as const;

  private readonly zeroShortcut: boolean;
  private readonly spaceShortcut: boolean;
  private readonly delimiters: boolean;
  private readonly requireFullBlocks: boolean;

  constructor(spec: Block85Spec) {
    super(spec);

    if (spec.alphabet.length !== 85) {
      throw new InvalidCodecError(
        `'block85' needs an alphabet of exactly 85 characters, got ${spec.alphabet.length}`,
      );
    }
    for (const [enabled, char] of [
      [spec.zeroShortcut, ZERO_CHAR],
      [spec.spaceShortcut, SPACE_CHAR],
    ] as const) {
      if (enabled === true && this.valueOf(char) !== undefined) {
        throw new InvalidCodecError(`shortcut character '${char}' is part of the alphabet`);
      }
    }

    this.zeroShortcut = spec.zeroShortcut ?? false;
    this.spaceShortcut = spec.spaceShortcut ?? false;
    this.delimiters = spec.delimiters ?? false;
    this.requireFullBlocks = spec.requireFullBlocks ?? false;
  }

  encode(buffer: BufferLike): string {
    if (this.requireFullBlocks && buffer.length % BYTES_PER_BLOCK !== 0) {
      throw new InvalidLengthError(
        buffer.length,
        `this codec encodes whole ${BYTES_PER_BLOCK}-byte blocks only`,
      );
    }

    const codes = this.codes;
    if (codes === null) {
      return this.encodeAsText(buffer);
    }

    const blocks = Math.ceil(buffer.length / BYTES_PER_BLOCK);
    const written = new Uint8Array(blocks * CHARS_PER_BLOCK + OPEN.length + CLOSE.length);
    let at = 0;
    if (this.delimiters) {
      at += this.writeAscii(written, at, OPEN);
    }

    // Whole blocks, with the five divisions unrolled. Dividing a float by 85
    // and truncating with `>>> 0` is several times quicker than `%` paired
    // with `Math.floor`, because every quotient here still fits in 32 bits.
    const whole = buffer.length - (buffer.length % BYTES_PER_BLOCK);
    for (let from = 0; from < whole; from += BYTES_PER_BLOCK) {
      const value =
        ((buffer[from] << 24) | (buffer[from + 1] << 16) | (buffer[from + 2] << 8) | buffer[from + 3]) >>>
        0;
      if (this.zeroShortcut && value === 0) {
        written[at++] = ZERO_CODE;
        continue;
      }
      if (this.spaceShortcut && value === SPACE_BLOCK) {
        written[at++] = SPACE_CODE;
        continue;
      }
      const q1 = (value / 85) >>> 0;
      const q2 = (q1 / 85) >>> 0;
      const q3 = (q2 / 85) >>> 0;
      const q4 = (q3 / 85) >>> 0;
      written[at] = codes[q4];
      written[at + 1] = codes[q3 - q4 * 85];
      written[at + 2] = codes[q2 - q3 * 85];
      written[at + 3] = codes[q1 - q2 * 85];
      written[at + 4] = codes[value - q1 * 85];
      at += CHARS_PER_BLOCK;
    }

    // The trailing partial block, encoded as `size + 1` characters.
    if (whole < buffer.length) {
      const size = buffer.length - whole;
      let value = 0;
      for (let i = 0; i < BYTES_PER_BLOCK; i++) {
        value = value * 256 + (whole + i < buffer.length ? buffer[whole + i] : 0);
      }
      const digits = new Uint8Array(CHARS_PER_BLOCK);
      for (let i = CHARS_PER_BLOCK - 1; i >= 0; i--) {
        const quotient = (value / 85) >>> 0;
        digits[i] = codes[value - quotient * 85];
        value = quotient;
      }
      for (let i = 0; i <= size; i++) {
        written[at++] = digits[i];
      }
    }
    if (this.delimiters) {
      at += this.writeAscii(written, at, CLOSE);
    }
    return this.textFrom(written, at);
  }

  decode(encoded: string, options?: DecodeOptions): Uint8Array {
    const bytes = this.readBytes(this.undelimit(this.strip(encoded)));
    const size = options?.size;
    if (size !== undefined && bytes.length !== size) {
      throw new BufferSizeError(bytes.length, size);
    }
    return Uint8Array.from(bytes);
  }

  validate(input: string): boolean {
    try {
      this.readBytes(this.undelimit(this.strip(input)));
      return true;
    } catch {
      return false;
    }
  }

  /** Writes an ASCII marker, returning how many bytes it took. */
  private writeAscii(into: Uint8Array, at: number, text: string): number {
    for (let i = 0; i < text.length; i++) {
      into[at + i] = text.charCodeAt(i);
    }
    return text.length;
  }

  /** The character-by-character path, for an alphabet that is not single-byte. */
  private encodeAsText(buffer: Uint8Array): string {
    let out = '';
    for (let at = 0; at < buffer.length; at += BYTES_PER_BLOCK) {
      const size = Math.min(BYTES_PER_BLOCK, buffer.length - at);
      let value = 0;
      for (let i = 0; i < BYTES_PER_BLOCK; i++) {
        value = value * 256 + (at + i < buffer.length ? buffer[at + i] : 0);
      }
      if (size === BYTES_PER_BLOCK && this.zeroShortcut && value === 0) {
        out += ZERO_CHAR;
      } else if (size === BYTES_PER_BLOCK && this.spaceShortcut && value === SPACE_BLOCK) {
        out += SPACE_CHAR;
      } else {
        out += this.digitsOf(value).slice(0, size === BYTES_PER_BLOCK ? CHARS_PER_BLOCK : size + 1);
      }
    }
    return this.delimiters ? OPEN + out + CLOSE : out;
  }

  /** Renders a block value as its five characters, most significant first. */
  private digitsOf(value: number): string {
    let rest = value;
    const digits: string[] = [];
    for (let i = 0; i < CHARS_PER_BLOCK; i++) {
      digits.unshift(this.chars[rest % 85]);
      rest = Math.floor(rest / 85);
    }
    return digits.join('');
  }

  /** Removes the framing, rejecting input that is missing or misplacing it. */
  private undelimit(input: string): string {
    if (!this.delimiters) {
      return input;
    }
    if (!input.startsWith(OPEN) || !input.endsWith(CLOSE) || input.length < OPEN.length + CLOSE.length) {
      throw new InvalidCharacterError();
    }
    return input.slice(OPEN.length, input.length - CLOSE.length);
  }

  /**
   * Decodes the body. Everything `decode` can reject other than
   * `DecodeOptions.size` is checked here, so `validate` and `decode` agree.
   */
  private readBytes(body: string): number[] {
    const bytes: number[] = [];
    let held = 0;
    let value = 0;
    let groupAt = 0;

    for (let i = 0; i < body.length; i++) {
      if (held === 0) {
        const code = body.charCodeAt(i);
        if (this.zeroShortcut && code === ZERO_CODE) {
          bytes.push(0, 0, 0, 0);
          continue;
        }
        if (this.spaceShortcut && code === SPACE_CODE) {
          bytes.push(0x20, 0x20, 0x20, 0x20);
          continue;
        }
        groupAt = i;
      }
      const digit = this.valueAt(body, i);
      if (digit < 0) {
        throw new InvalidCharacterError(body[i]);
      }
      value = value * 85 + digit;
      held++;
      if (held === CHARS_PER_BLOCK) {
        if (value >= BLOCK_LIMIT) {
          throw new ValueRangeError(body.slice(groupAt, i + 1));
        }
        bytes.push(
          (value / 0x1000000) & 0xff,
          (value / 0x10000) & 0xff,
          (value / 0x100) & 0xff,
          value & 0xff,
        );
        held = 0;
        value = 0;
      }
    }

    if (held > 0) {
      this.readPartial(body.slice(groupAt), bytes);
    }
    return bytes;
  }

  /**
   * Decodes a trailing group of 2..4 characters into 1..3 bytes.
   *
   * The group is padded to a whole block with the highest digit so that the
   * missing low-order bytes cannot round the value down, then the bytes the
   * group actually carries are kept.
   */
  private readPartial(group: string, bytes: number[]): void {
    if (this.requireFullBlocks) {
      throw new InvalidLengthError(
        group.length,
        `this codec decodes whole ${CHARS_PER_BLOCK}-character blocks only`,
      );
    }
    if (group.length < 2) {
      throw new InvalidLengthError(
        group.length,
        `a trailing group needs at least 2 characters to carry a byte`,
      );
    }

    const padded = group.padEnd(CHARS_PER_BLOCK, this.chars[84]);
    let value = 0;
    for (let i = 0; i < CHARS_PER_BLOCK; i++) {
      const digit = this.valueAt(padded, i);
      if (digit < 0) {
        throw new InvalidCharacterError(padded[i]);
      }
      value = value * 85 + digit;
    }
    if (value >= BLOCK_LIMIT) {
      throw new ValueRangeError(group);
    }

    const carried = group.length - 1;
    const block: number[] = [];
    for (let shift = 24; shift >= 0; shift -= 8) {
      block.push((value / 2 ** shift) & 0xff);
    }
    const kept = block.slice(0, carried);

    if (this.strict) {
      let padded = 0;
      for (let i = 0; i < BYTES_PER_BLOCK; i++) {
        padded = padded * 256 + (i < carried ? kept[i] : 0);
      }
      if (this.digitsOf(padded).slice(0, group.length) !== group) {
        throw new NonCanonicalError(`'${group}' is not the shortest encoding of its bytes`);
      }
    }
    bytes.push(...kept);
  }
}
