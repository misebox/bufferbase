/**
 * Error thrown when an invalid character is encountered during decoding.
 *
 * @example
 * ```typescript
 * import { decode, InvalidCharacterError } from 'bufferbase';
 *
 * try {
 *   decode('invalid!', 'base58');
 * } catch (e) {
 *   if (e instanceof InvalidCharacterError) {
 *     console.log(e.message); // "Invalid character found: '!'"
 *   }
 * }
 * ```
 */
export class InvalidCharacterError extends Error {
  /**
   * @param char - The invalid character that was encountered (optional)
   */
  constructor(char?: string) {
    const message = char ? `Invalid character found: '${char}'` : 'Invalid character found';
    super(message);
    this.name = 'InvalidCharacterError';
  }
}

/**
 * Error thrown when decoded buffer size exceeds the specified size.
 *
 * This error is thrown when using the `size` option in decode operations
 * and the decoded data is larger than the specified size.
 *
 * @example
 * ```typescript
 * import { decode, BufferSizeError } from 'bufferbase';
 *
 * try {
 *   // Trying to decode into a buffer too small
 *   decode('72k1xXWG59fYdzSNoA', 'base58', { size: 2 });
 * } catch (e) {
 *   if (e instanceof BufferSizeError) {
 *     console.log(e.message); // "Buffer size 13 exceeds specified size 2"
 *   }
 * }
 * ```
 */
export class BufferSizeError extends Error {
  /**
   * @param actual - The actual decoded buffer size
   * @param expected - The expected (specified) buffer size
   */
  constructor(actual: number, expected: number) {
    super(`Buffer size ${actual} exceeds specified size ${expected}`);
    this.name = 'BufferSizeError';
  }
}

/**
 * Error thrown when an unknown base name is provided.
 *
 * This error is thrown when using the function API with an invalid base name
 * that is neither a known encoding name nor a valid custom character set
 * (character sets must be longer than 15 characters).
 *
 * @example
 * ```typescript
 * import { encode, UnknownBaseError } from 'bufferbase';
 *
 * try {
 *   encode(Buffer.from('test'), 'invalidbase');
 * } catch (e) {
 *   if (e instanceof UnknownBaseError) {
 *     console.log(e.message); // "Unknown base encoding: 'invalidbase'"
 *   }
 * }
 * ```
 */
export class UnknownBaseError extends Error {
  /**
   * @param name - The unknown base name that was provided
   */
  constructor(name: string) {
    super(`Unknown base encoding: '${name}'`);
    this.name = 'UnknownBaseError';
  }
}
