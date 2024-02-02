/**
 * A collection of common bases.
 */
export const Chars = {
  Decimal: '0123456789',
  Base16: '0123456789ABCDEF',
  Base32: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567',
  Base32Crockford: '0123456789ABCDEFGHJKMNPQRSTVWXYZ',
  Base36: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  Base52: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  Base58: '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
  Base64_STD:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
  Base64_URL_SAFE:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
  Base64_XML_NMTOKEN:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._',
  Base64_XML_NAME:
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_:',
  Ascii85:
    '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_`abcdefghijklmnopqrstu',
  Base85:
    '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&()*+-;<=>?@^_`{|}~',
  Z85: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#',
};

export class InvalidCharacterError extends Error {
  message = 'Invalid character found';
}

export class BufferSizeError extends Error {
  message = 'Buffer size exceeds specified size';
}

/**
 * Encodes and decodes buffers to and from a base.
 */
export class BufferEncoder {
  constructor(private baseChars: string) {}

  /**
   * Encodes a buffer to a string.
   */
  encode(buffer: Buffer): string {
    let result = [];
    for (const byte of buffer) {
      let carry = byte;
      for (let j = 0; j < result.length; j++) {
        carry += result[j] * 256;
        result[j] = carry % this.baseChars.length;
        carry = Math.floor(carry / this.baseChars.length);
      }
      while (carry > 0) {
        result.push(carry % this.baseChars.length);
        carry = Math.floor(carry / this.baseChars.length);
      }
    }
    for (const byte of buffer) {
      if (byte === 0) {
        result.push(0);
      } else {
        break;
      }
    }
    return result
      .reverse()
      .map((index) => this.baseChars[index])
      .join('');
  }

  /**
   * Decodes a string to a buffer.
   */
  decode(encoded: string, bufferSize?: number): Buffer {
    let result = Buffer.alloc(0);
    for (const char of encoded) {
      const value = this.baseChars.indexOf(char);
      if (value === -1) throw new InvalidCharacterError();
      let carry = value;
      let tempResult = Buffer.alloc(result.length);
      let i;
      for (i = 0; i < result.length; i++) {
        carry += result[i] * this.baseChars.length;
        tempResult[i] = carry % 256;
        carry = Math.floor(carry / 256);
      }
      while (carry > 0) {
        tempResult = Buffer.concat([tempResult, Buffer.from([carry % 256])]);
        carry = Math.floor(carry / 256);
      }
      result = tempResult;
    }
    // buffer size
    if (bufferSize && result.length < bufferSize) {
      result = Buffer.concat([
        result,
        Buffer.from(Array(bufferSize - result.length).fill(0)),
      ]);
    }
    if (bufferSize && result.length > bufferSize) {
      throw new BufferSizeError();
    }
    result.reverse();
    return result;
  }
}

/**
 * Creates a converter function that can convert between two bases.
 */
export class Converter {
  decoder: BufferEncoder;
  encoder: BufferEncoder;

  constructor(inputBase: string, outputBase: string) {
    this.decoder = new BufferEncoder(inputBase);
    this.encoder = new BufferEncoder(outputBase);
  }

  /**
   * Converts a string from the input base to the output base.
   */
  convert(input: string): string {
    return this.encoder.encode(this.decoder.decode(input));
  }
}

export class Validator {
  decorder: BufferEncoder;

  constructor(inputBase: string) {
    this.decorder = new BufferEncoder(inputBase);
  }

  validate(input: string): boolean {
    try {
      this.decorder.decode(input);
      return true;
    } catch (e) {
      if (e instanceof InvalidCharacterError) {
        return false;
      }
      throw e;
    }
  }
}

export const validate = (input: string, base: string): boolean => {
  return new Validator(base).validate(input);
};
