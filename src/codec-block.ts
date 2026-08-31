import type { BlockSpec, BufferLike, DecodeOptions } from './types.js';
import { BaseCodec } from './codec-base.js';
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

/** Produces exactly what the generic loop would, but in the runtime's own code. */
type NativeEncoder = (bytes: Uint8Array) => string;

interface Base64Options {
  alphabet?: 'base64' | 'base64url';
  omitPadding?: boolean;
}

const nativeToBase64 = (Uint8Array.prototype as { toBase64?: (o?: Base64Options) => string })
  .toBase64;
const nativeToHex = (Uint8Array.prototype as { toHex?: () => string }).toHex;

/** Node's Buffer when the runtime has one, reached without importing `node:buffer`. */
const nodeBuffer = (
  globalThis as {
    Buffer?: {
      from(buffer: ArrayBufferLike, offset: number, length: number): { toString(encoding: string): string };
    };
  }
).Buffer;

/** Views the bytes as a Buffer without copying, when Buffer exists. */
function viaBuffer(encoding: string): NativeEncoder | null {
  if (nodeBuffer === undefined) {
    return null;
  }
  return (bytes) => nodeBuffer.from(bytes.buffer, bytes.byteOffset, bytes.length).toString(encoding);
}

/**
 * Finds a built-in encoder equivalent to a spec, if the runtime has one.
 *
 * These are 100-250x faster than the loop below and always emit canonical
 * output, so an exact match is handed off. Decoding is never handed off: the
 * built-in decoders are lenient, and rejecting non-canonical input is the point
 * of this codec.
 */
function nativeEncoderFor(alphabet: string, pad: string | false): NativeEncoder | null {
  if (alphabet === RFC_BASE64 && pad === '=') {
    return nativeToBase64 === undefined
      ? viaBuffer('base64')
      : (bytes) => nativeToBase64.call(bytes);
  }
  if (alphabet === RFC_BASE64URL && pad === false) {
    return nativeToBase64 === undefined
      ? viaBuffer('base64url')
      : (bytes) => nativeToBase64.call(bytes, { alphabet: 'base64url', omitPadding: true });
  }
  if (pad === false && (alphabet === HEX_LOWER || alphabet === HEX_UPPER)) {
    const lower = nativeToHex === undefined ? viaBuffer('hex') : (bytes: Uint8Array) => nativeToHex.call(bytes);
    if (lower === null) {
      return null;
    }
    return alphabet === HEX_LOWER ? lower : (bytes) => lower(bytes).toUpperCase();
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

  encode(buffer: BufferLike): string {
    if (this.native !== null) {
      return this.native(buffer);
    }

    const bits = this.bitsPerChar;
    const mask = this.chars.length - 1;
    const codes = this.codes;
    if (codes === null) {
      return this.encodeAsText(buffer);
    }

    const dataChars = Math.ceil((buffer.length * 8) / bits);
    const total =
      this.padChar === false
        ? dataChars
        : Math.ceil(dataChars / this.charsPerBlock) * this.charsPerBlock;
    const written = new Uint8Array(total);
    let at = 0;
    let acc = 0;
    let held = 0;

    for (let i = 0; i < buffer.length; i++) {
      acc = ((acc << 8) | buffer[i]) & 0xffff;
      held += 8;
      while (held >= bits) {
        held -= bits;
        written[at++] = codes[(acc >>> held) & mask];
      }
    }
    if (held > 0) {
      written[at++] = codes[(acc << (bits - held)) & mask];
    }
    if (this.padChar !== false) {
      const padCode = this.padChar.charCodeAt(0);
      while (at < total) {
        written[at++] = padCode;
      }
    }
    return this.textFrom(written, at);
  }

  /** The character-by-character path, for an alphabet that is not single-byte. */
  private encodeAsText(buffer: Uint8Array): string {
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

  decode(encoded: string, options?: DecodeOptions): Uint8Array {
    const data = this.checkStructure(this.strip(encoded));
    const bits = this.bitsPerChar;
    const bytes = new Uint8Array(Math.floor((data.length * bits) / 8));
    let at = 0;
    let acc = 0;
    let held = 0;

    for (let i = 0; i < data.length; i++) {
      const value = this.valueAt(data, i);
      if (value < 0) {
        throw new InvalidCharacterError(data[i]);
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
      this.checkStructure(this.strip(input));
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

    let last = -1;
    for (let i = 0; i < data.length; i++) {
      last = this.valueAt(data, i);
      if (last < 0) {
        throw new InvalidCharacterError(data[i]);
      }
    }

    if (this.strict && spare > 0 && last >= 0 && (last & ((1 << spare) - 1)) !== 0) {
      throw new NonCanonicalError(
        `the final character carries ${spare} spare bits that must be zero`,
      );
    }
    return data;
  }
}
