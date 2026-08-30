/**
 * @deprecated Use the current API instead:
 * - `encode(buffer, 'base58')` or `Codecs.base58.encode(buffer)`
 * - `decode(encoded, 'base58')` or `Codecs.base58.decode(encoded)`
 * - `convert(input, 'base58', 'base64')` or `Codecs.base58.convertTo(...)`
 * - `validate(input, 'base58')` or `Codecs.base58.validate(input)`
 *
 * These classes take a bare alphabet, which always meant a radix conversion,
 * so they keep behaving exactly as they did.
 */

import type { Buffer } from 'node:buffer';
import type { BufferLike } from './types.js';
import { RadixCodec } from './codec-radix.js';

/** @deprecated Import `Chars` from the package root. */
export { Chars } from './bases.js';

/** @deprecated Import these from the package root. */
export { BufferSizeError, InvalidCharacterError } from './errors.js';

/** @deprecated Use `createCodec(alphabet)`. */
export class BufferEncoder {
  private readonly codec: RadixCodec;

  constructor(baseChars: string) {
    this.codec = new RadixCodec({ alphabet: baseChars, algorithm: 'radix' });
  }

  encode(buffer: BufferLike): string {
    return this.codec.encode(buffer);
  }

  decode(encoded: string, bufferSize?: number): Buffer {
    return this.codec.decode(encoded, bufferSize === undefined ? undefined : { size: bufferSize });
  }
}

/** @deprecated Use `convert()` or `codec.convertTo()`. */
export class Converter {
  readonly decoder: BufferEncoder;
  readonly encoder: BufferEncoder;

  constructor(inputBase: string, outputBase: string) {
    this.decoder = new BufferEncoder(inputBase);
    this.encoder = new BufferEncoder(outputBase);
  }

  convert(input: string): string {
    return this.encoder.encode(this.decoder.decode(input));
  }
}

/** @deprecated Use `validate()` or `codec.validate()`. */
export class Validator {
  private readonly codec: RadixCodec;

  constructor(inputBase: string) {
    this.codec = new RadixCodec({ alphabet: inputBase, algorithm: 'radix' });
  }

  validate(input: string): boolean {
    return this.codec.validate(input);
  }
}
