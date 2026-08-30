import { Buffer } from 'node:buffer';
import type { Algorithm, BufferLike, CodecSpec, DecodeOptions, ICodec } from './types.js';
import { InvalidCodecError } from './errors.js';

/** Returns one byte per character, or `null` if the alphabet needs more. */
function singleByteCodes(alphabet: string): Uint8Array | null {
  const codes = new Uint8Array(alphabet.length);
  for (let i = 0; i < alphabet.length; i++) {
    const code = alphabet.charCodeAt(i);
    if (code > 0xff) {
      return null;
    }
    codes[i] = code;
  }
  return codes;
}

/** Indexes the decodable characters by code unit, or `null` if any needs more than a byte. */
function codeTable(charToIndex: ReadonlyMap<string, number>): Int16Array | null {
  const table = new Int16Array(256).fill(-1);
  for (const [char, value] of charToIndex) {
    const code = char.charCodeAt(0);
    if (char.length !== 1 || code > 0xff) {
      return null;
    }
    table[code] = value;
  }
  return table;
}

/** Converts a `BufferLike` to a `Buffer` without copying when possible. */
export function toBuffer(input: BufferLike): Buffer {
  return Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.length);
}

/**
 * Shared alphabet handling for the three codec implementations.
 *
 * Subclasses provide the mapping between bytes and characters; this class owns
 * the alphabet, the character lookup, optional case folding, and `convertTo`.
 */
export abstract class BaseCodec implements ICodec {
  /** Character set used for encoding. */
  readonly chars: string;

  /** The algorithm this codec applies to `chars`. */
  abstract readonly algorithm: Algorithm;

  /** Whether non-canonical input is rejected. */
  protected readonly strict: boolean;

  private readonly charToIndex: Map<string, number>;

  /** Characters dropped from the input before decoding. */
  private readonly ignored: ReadonlySet<string>;

  /**
   * The alphabet as one byte per character, or `null` when some character does
   * not fit in a byte.
   *
   * Assembling output as bytes and decoding it once is several times faster
   * than concatenating characters, and every alphabet in practical use is
   * single-byte.
   */
  protected readonly codes: Uint8Array | null;

  /**
   * The value of every decodable character, indexed by code unit, or `-1`.
   * `null` when some character does not fit in a byte.
   *
   * Reading a character by index and looking it up here avoids allocating a
   * string and hashing it for every character of the input.
   */
  private readonly valueByCode: Int16Array | null;

  protected constructor(spec: CodecSpec) {
    const { alphabet, strict = true, caseInsensitive = false, aliases, ignore } = spec;

    if (alphabet.length < 2) {
      throw new InvalidCodecError(`alphabet needs at least 2 characters, got ${alphabet.length}`);
    }
    if (new Set(alphabet).size !== alphabet.length) {
      throw new InvalidCodecError('alphabet contains duplicate characters');
    }
    if ([...alphabet].some((char) => char.length !== 1)) {
      throw new InvalidCodecError('every alphabet character must be a single code unit');
    }
    if (caseInsensitive && new Set(alphabet.toLowerCase()).size !== alphabet.length) {
      throw new InvalidCodecError(
        'caseInsensitive needs an alphabet that does not contain both cases of a letter',
      );
    }

    this.chars = alphabet;
    this.strict = strict;
    this.charToIndex = new Map();

    const accept = (char: string, value: number): void => {
      this.charToIndex.set(char, value);
      if (caseInsensitive) {
        this.charToIndex.set(char.toLowerCase(), value);
        this.charToIndex.set(char.toUpperCase(), value);
      }
    };

    for (let i = 0; i < alphabet.length; i++) {
      accept(alphabet[i], i);
    }

    for (const [from, to] of Object.entries(aliases ?? {})) {
      if (from.length !== 1) {
        throw new InvalidCodecError(`alias '${from}' must be a single character`);
      }
      const value = this.charToIndex.get(to);
      if (value === undefined) {
        throw new InvalidCodecError(`alias '${from}' points at '${to}', which is not in the alphabet`);
      }
      if (alphabet.includes(from)) {
        throw new InvalidCodecError(`alias '${from}' is already in the alphabet`);
      }
      accept(from, value);
    }

    this.codes = singleByteCodes(alphabet);
    this.valueByCode = codeTable(this.charToIndex);
    this.ignored = new Set(ignore ?? '');
    for (const char of this.ignored) {
      if (this.charToIndex.has(char)) {
        throw new InvalidCodecError(`ignored character '${char}' is also decodable`);
      }
    }
  }

  /** Reads the first `length` bytes of `written` back as text. */
  protected textFrom(written: Uint8Array, length: number): string {
    return Buffer.from(written.buffer, written.byteOffset, length).toString('latin1');
  }

  /** Drops the characters this codec ignores, such as readability hyphens. */
  protected strip(input: string): string {
    if (this.ignored.size === 0) {
      return input;
    }
    let out = '';
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (!this.ignored.has(char)) {
        out += char;
      }
    }
    return out;
  }

  /** Returns the value of a character, or `undefined` if it is not in the alphabet. */
  protected valueOf(char: string): number | undefined {
    return this.charToIndex.get(char);
  }

  /**
   * Returns the value of the character at `index`, or `-1` if it is not
   * decodable. This is the hot path of every decoder.
   */
  protected valueAt(input: string, index: number): number {
    const table = this.valueByCode;
    if (table === null) {
      const value = this.charToIndex.get(input[index]);
      return value === undefined ? -1 : value;
    }
    const code = input.charCodeAt(index);
    return code > 0xff ? -1 : table[code];
  }

  abstract encode(buffer: BufferLike): string;
  abstract decode(encoded: string, options?: DecodeOptions): Buffer;
  abstract validate(input: string): boolean;

  /** Decodes with this codec, then re-encodes with `target`. */
  convertTo(target: ICodec, input: string): string {
    return target.encode(this.decode(input));
  }
}
