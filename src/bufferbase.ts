/**
 * @deprecated Use the new API instead:
 * - `encode(buffer, 'base58')` or `base58.encode(buffer)`
 * - `decode(encoded, 'base58')` or `base58.decode(encoded)`
 * - `convert(input, 'base58', 'base64')` or `base58.convertTo(base64, input)`
 * - `validate(input, 'base58')` or `base58.validate(input)`
 */

import { Buffer } from 'node:buffer';
import { Codec } from './codec.js';
import { InvalidCharacterError, BufferSizeError } from './errors.js';

// Re-export Chars for backward compatibility
export { Chars } from './bases.js';

// Re-export errors
export { InvalidCharacterError, BufferSizeError };

/**
 * @deprecated Use `Codec` or `createCodec()` instead.
 */
export class BufferEncoder {
  private codec: Codec;

  constructor(private baseChars: string) {
    this.codec = new Codec(baseChars);
  }

  encode(buffer: Buffer): string {
    return this.codec.encode(buffer);
  }

  decode(encoded: string, bufferSize?: number): Buffer {
    return this.codec.decode(encoded, bufferSize !== undefined ? { size: bufferSize } : undefined);
  }
}

/**
 * @deprecated Use `convert()` function or `codec.convertTo()` instead.
 */
export class Converter {
  decoder: BufferEncoder;
  encoder: BufferEncoder;

  constructor(inputBase: string, outputBase: string) {
    this.decoder = new BufferEncoder(inputBase);
    this.encoder = new BufferEncoder(outputBase);
  }

  convert(input: string): string {
    return this.encoder.encode(this.decoder.decode(input));
  }
}

/**
 * @deprecated Use `validate()` function or `codec.validate()` instead.
 */
export class Validator {
  private codec: Codec;

  constructor(inputBase: string) {
    this.codec = new Codec(inputBase);
  }

  validate(input: string): boolean {
    return this.codec.validate(input);
  }
}

/**
 * @deprecated Use `validate()` from the main module instead.
 */
export const validate = (input: string, base: string): boolean => {
  return new Validator(base).validate(input);
};
