/**
 * Error thrown when an invalid character is encountered during decoding.
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
 * Error thrown when the decoded buffer does not have the size requested
 * through `DecodeOptions.size`.
 */
export class BufferSizeError extends Error {
  /**
   * @param actual - The actual decoded buffer size
   * @param expected - The expected (specified) buffer size
   */
  constructor(actual: number, expected: number) {
    super(`Buffer size ${actual} does not match specified size ${expected}`);
    this.name = 'BufferSizeError';
  }
}

/**
 * Error thrown when an unknown base name is provided.
 */
export class UnknownBaseError extends Error {
  /**
   * @param name - The unknown base name that was provided
   */
  constructor(name: string) {
    super(
      `Unknown base encoding: '${name}'. ` +
        'Pass a CodecSpec such as { alphabet, algorithm: \'radix\' } to use a custom alphabet.',
    );
    this.name = 'UnknownBaseError';
  }
}

/**
 * Error thrown when a string cannot be the encoding of any byte sequence
 * because of its length.
 *
 * A Base64 string of 5 characters, for example, describes 30 bits: too many
 * for 3 bytes and too few for 4.
 */
export class InvalidLengthError extends Error {
  /**
   * @param length - The length that cannot occur
   * @param detail - What the length should have been
   */
  constructor(length: number, detail: string) {
    super(`Invalid encoded length ${length}: ${detail}`);
    this.name = 'InvalidLengthError';
  }
}

/**
 * Error thrown when input is well-formed but is not the canonical encoding of
 * the bytes it decodes to (RFC 4648 §3.5).
 *
 * Accepting such input makes decoding non-injective: `'Zm8='` and `'Zm9='`
 * would both decode to `'fo'`. Pass `strict: false` in the codec spec to allow
 * it.
 */
export class NonCanonicalError extends Error {
  /**
   * @param detail - What made the input non-canonical
   */
  constructor(detail: string) {
    super(`Non-canonical encoding: ${detail}`);
    this.name = 'NonCanonicalError';
  }
}

/**
 * Error thrown when a codec spec cannot be realised, such as a `'block'`
 * algorithm with an alphabet whose length is not a power of two.
 */
export class InvalidCodecError extends Error {
  /**
   * @param detail - Why the spec is unusable
   */
  constructor(detail: string) {
    super(`Invalid codec: ${detail}`);
    this.name = 'InvalidCodecError';
  }
}

/**
 * Error thrown when a group of characters denotes a number too large for the
 * bytes it is supposed to encode.
 *
 * In an Ascii85 group, five characters must denote a value below 2^32; `'s8W-!'`
 * does not, so it encodes nothing. Unlike `NonCanonicalError` this is never
 * allowed, because there is no byte sequence to decode to.
 */
export class ValueRangeError extends Error {
  /**
   * @param group - The group of characters that is out of range
   */
  constructor(group: string) {
    super(`Encoded group '${group}' exceeds the maximum value for its block`);
    this.name = 'ValueRangeError';
  }
}

/**
 * Error thrown when a trailing check symbol does not match the value it
 * follows, which means the string was mistyped or corrupted.
 */
export class CheckSymbolError extends Error {
  /**
   * @param found - The check symbol present in the input
   * @param expected - The check symbol the value calls for
   */
  constructor(found: string, expected: string) {
    super(`Check symbol '${found}' does not match the expected '${expected}'`);
    this.name = 'CheckSymbolError';
  }
}
