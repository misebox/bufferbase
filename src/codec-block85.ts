import { Buffer } from 'node:buffer';
import type { Block85Spec, BufferLike, DecodeOptions } from './types.js';
import { BaseCodec, toBuffer } from './codec-base.js';
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
const SPACE_CHAR = 'y';
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

  encode(input: BufferLike): string {
    const buffer = toBuffer(input);
    if (this.requireFullBlocks && buffer.length % BYTES_PER_BLOCK !== 0) {
      throw new InvalidLengthError(
        buffer.length,
        `this codec encodes whole ${BYTES_PER_BLOCK}-byte blocks only`,
      );
    }

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

  decode(encoded: string, options?: DecodeOptions): Buffer {
    const bytes = this.readBytes(this.undelimit(encoded));
    const size = options?.size;
    if (size !== undefined && bytes.length !== size) {
      throw new BufferSizeError(bytes.length, size);
    }
    return Buffer.from(bytes);
  }

  validate(input: string): boolean {
    try {
      this.readBytes(this.undelimit(input));
      return true;
    } catch {
      return false;
    }
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
    let group = '';

    const flushWhole = (): void => {
      let value = 0;
      for (const char of group) {
        const digit = this.valueOf(char);
        if (digit === undefined) {
          throw new InvalidCharacterError(char);
        }
        value = value * 85 + digit;
      }
      if (value >= BLOCK_LIMIT) {
        throw new ValueRangeError(group);
      }
      for (let shift = 24; shift >= 0; shift -= 8) {
        bytes.push((value / 2 ** shift) & 0xff);
      }
      group = '';
    };

    for (const char of body) {
      if (group === '' && this.zeroShortcut && char === ZERO_CHAR) {
        bytes.push(0, 0, 0, 0);
        continue;
      }
      if (group === '' && this.spaceShortcut && char === SPACE_CHAR) {
        bytes.push(0x20, 0x20, 0x20, 0x20);
        continue;
      }
      if (this.valueOf(char) === undefined) {
        throw new InvalidCharacterError(char);
      }
      group += char;
      if (group.length === CHARS_PER_BLOCK) {
        flushWhole();
      }
    }

    if (group.length > 0) {
      this.readPartial(group, bytes);
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

    const top = this.chars[84];
    let value = 0;
    for (const char of group.padEnd(CHARS_PER_BLOCK, top)) {
      const digit = this.valueOf(char);
      if (digit === undefined) {
        throw new InvalidCharacterError(char);
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
