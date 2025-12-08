/**
 * Error thrown when an invalid character is encountered during decoding.
 */
export class InvalidCharacterError extends Error {
  constructor(char?: string) {
    const message = char
      ? `Invalid character found: '${char}'`
      : 'Invalid character found';
    super(message);
    this.name = 'InvalidCharacterError';
  }
}

/**
 * Error thrown when decoded buffer size doesn't match the specified size.
 */
export class BufferSizeError extends Error {
  constructor(actual: number, expected: number) {
    super(`Buffer size ${actual} exceeds specified size ${expected}`);
    this.name = 'BufferSizeError';
  }
}

/**
 * Error thrown when an unknown base name is provided.
 */
export class UnknownBaseError extends Error {
  constructor(name: string) {
    super(`Unknown base encoding: '${name}'`);
    this.name = 'UnknownBaseError';
  }
}
