import { Buffer } from 'node:buffer';
import type { BlockSpec, BufferLike, DecodeOptions } from './types.js';
import { BaseCodec, toBuffer } from './codec-base.js';
import {
  BufferSizeError,
  InvalidCharacterError,
  InvalidCodecError,
  InvalidLengthError,
  NonCanonicalError,
} from './errors.js';

const RFC_BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const RFC_BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const HEX_LOWER = '0123456789abcdef';
const HEX_UPPER = '0123456789ABCDEF';

/** A Node encoding that produces exactly what this codec would, and whether it needs upper-casing. */
type NativeEncoder = { readonly encoding: 'base64' | 'base64url' | 'hex'; readonly upper: boolean };

/**
 * Finds the Node encoding equivalent to a spec, if there is one.
 *
 * Node's encoders are 100-250x faster than the loop below and always emit
 * canonical output, so an exact match is handed off. Decoding is never handed
 * off: Node's decoders are lenient, and rejecting non-canonical input is the
 * point of this codec.
 */
function nativeEncoderFor(alphabet: string, pad: string | false): NativeEncoder | null {
  if (alphabet === RFC_BASE64 && pad === '=') {
    return { encoding: 'base64', upper: false };
  }
  if (alphabet === RFC_BASE64URL && pad === false) {
    return { encoding: 'base64url', upper: false };
  }
  if (pad === false && (alphabet === HEX_LOWER || alphabet === HEX_UPPER)) {
    return { encoding: 'hex', upper: alphabet === HEX_UPPER };
  }
  return null;
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * Regroups the bit stream into fixed-width chunks, as specified by RFC 4648.
 *
 * Each character carries `log2(alphabet.length)` bits, so the alphabet must
 * hold 2, 4, 8, 16, 32, or 64 characters. Unlike a radix conversion the output
 * length is a fixed function of the input length, which is what makes Base64
 * and Base32 splittable and streamable.
 *
 * A trailing partial block leaves spare bits in the final character. RFC 4648
 * §3.5 requires those bits to be zero for the encoding to be canonical; input
 * that sets them is rejected unless the spec passes `strict: false`.
 *
 * @example
 * ```typescript
 * import { Codecs } from 'bufferbase';
 *
 * Codecs.base64.encode(Buffer.from('fo')); // 'Zm8='
 * Codecs.base64.validate('Zm9=');          // false — spare bits are not zero
 * ```
 */
export class BlockCodec extends BaseCodec {
  readonly algorithm = 'block' as const;

  /** Bits carried by one character. */
  private readonly bitsPerChar: number;
  /** Characters in a whole block. */
  private readonly charsPerBlock: number;
  private readonly padChar: string | false;
  private readonly native: NativeEncoder | null;

  constructor(spec: BlockSpec) {
    super(spec);

    const bits = Math.log2(spec.alphabet.length);
    if (!Number.isInteger(bits)) {
      throw new InvalidCodecError(
        `'block' needs an alphabet of 2, 4, 8, 16, 32, or 64 characters, got ${spec.alphabet.length}`,
      );
    }

    const pad = spec.pad ?? '=';
    if (pad !== false) {
      if (pad.length !== 1) {
        throw new InvalidCodecError(`pad must be a single character, got '${pad}'`);
      }
      if (this.valueOf(pad) !== undefined) {
        throw new InvalidCodecError(`pad character '${pad}' is part of the alphabet`);
      }
    }

    this.bitsPerChar = bits;
    this.charsPerBlock = 8 / gcd(8, bits);
    this.padChar = pad;
    this.native = nativeEncoderFor(spec.alphabet, pad);
  }

  encode(input: BufferLike): string {
    const buffer = toBuffer(input);
    if (this.native !== null) {
      const encoded = buffer.toString(this.native.encoding);
      return this.native.upper ? encoded.toUpperCase() : encoded;
    }

    const bits = this.bitsPerChar;
    const mask = this.chars.length - 1;
    let out = '';
    let acc = 0;
    let held = 0;

    for (const byte of buffer) {
      acc = ((acc << 8) | byte) & 0xffff;
      held += 8;
      while (held >= bits) {
        held -= bits;
        out += this.chars[(acc >>> held) & mask];
      }
    }
    if (held > 0) {
      out += this.chars[(acc << (bits - held)) & mask];
    }
    if (this.padChar !== false) {
      while (out.length % this.charsPerBlock !== 0) {
        out += this.padChar;
      }
    }
    return out;
  }

  decode(encoded: string, options?: DecodeOptions): Buffer {
    const data = this.checkStructure(encoded);
    const bits = this.bitsPerChar;
    const bytes = Buffer.alloc(Math.floor((data.length * bits) / 8));
    let at = 0;
    let acc = 0;
    let held = 0;

    for (const char of data) {
      const value = this.valueOf(char);
      if (value === undefined) {
        throw new InvalidCharacterError(char);
      }
      acc = ((acc << bits) | value) & 0xffff;
      held += bits;
      if (held >= 8) {
        held -= 8;
        bytes[at++] = (acc >>> held) & 0xff;
      }
    }

    const size = options?.size;
    if (size !== undefined && bytes.length !== size) {
      throw new BufferSizeError(bytes.length, size);
    }
    return bytes;
  }

  validate(input: string): boolean {
    try {
      this.checkStructure(input);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Strips and checks the padding, then verifies that what remains can be the
   * encoding of some byte sequence. Returns the data characters.
   *
   * Everything `decode` can reject other than `DecodeOptions.size` is checked
   * here, so `validate` and `decode` always agree.
   */
  private checkStructure(input: string): string {
    let data = input;

    if (this.padChar !== false) {
      let dataLength = input.length;
      while (dataLength > 0 && input[dataLength - 1] === this.padChar) {
        dataLength--;
      }
      data = input.slice(0, dataLength);
      if (input.length % this.charsPerBlock !== 0) {
        throw new InvalidLengthError(
          input.length,
          `padded input must be a multiple of ${this.charsPerBlock} characters`,
        );
      }
      if (input.length - dataLength >= this.charsPerBlock) {
        throw new InvalidLengthError(input.length, 'too many padding characters');
      }
    }

    const bits = this.bitsPerChar;
    const spare = (data.length * bits) % 8;
    if (spare >= bits) {
      throw new InvalidLengthError(
        data.length,
        `${data.length} characters carry ${data.length * bits} bits, which is not a whole number of bytes`,
      );
    }

    let last: number | undefined;
    for (const char of data) {
      last = this.valueOf(char);
      if (last === undefined) {
        throw new InvalidCharacterError(char);
      }
    }

    if (this.strict && spare > 0 && last !== undefined && (last & ((1 << spare) - 1)) !== 0) {
      throw new NonCanonicalError(
        `the final character carries ${spare} spare bits that must be zero`,
      );
    }
    return data;
  }
}
