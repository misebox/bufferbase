import { Buffer } from 'node:buffer';
import type { Algorithm, BufferLike, CodecSpec, DecodeOptions, ICodec } from './types.js';
import { InvalidCodecError } from './errors.js';

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

  protected constructor(spec: CodecSpec) {
    const { alphabet, strict = true, caseInsensitive = false } = spec;

    if (alphabet.length < 2) {
      throw new InvalidCodecError(`alphabet needs at least 2 characters, got ${alphabet.length}`);
    }
    if (new Set(alphabet).size !== alphabet.length) {
      throw new InvalidCodecError('alphabet contains duplicate characters');
    }
    if (caseInsensitive && new Set(alphabet.toLowerCase()).size !== alphabet.length) {
      throw new InvalidCodecError(
        'caseInsensitive needs an alphabet that does not contain both cases of a letter',
      );
    }

    this.chars = alphabet;
    this.strict = strict;
    this.charToIndex = new Map();
    for (let i = 0; i < alphabet.length; i++) {
      const char = alphabet[i];
      this.charToIndex.set(char, i);
      if (caseInsensitive) {
        this.charToIndex.set(char.toLowerCase(), i);
        this.charToIndex.set(char.toUpperCase(), i);
      }
    }
  }

  /** Returns the value of a character, or `undefined` if it is not in the alphabet. */
  protected valueOf(char: string): number | undefined {
    return this.charToIndex.get(char);
  }

  abstract encode(buffer: BufferLike): string;
  abstract decode(encoded: string, options?: DecodeOptions): Buffer;
  abstract validate(input: string): boolean;

  /** Decodes with this codec, then re-encodes with `target`. */
  convertTo(target: ICodec, input: string): string {
    return target.encode(this.decode(input));
  }
}
