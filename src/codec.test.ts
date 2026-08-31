import { Buffer } from 'node:buffer';
import { describe, test, expect } from 'bun:test';

import {
  encode,
  decode,
  convert,
  validate,
  createCodec,
  Codecs,
  Chars,
  InvalidCharacterError,
  BufferSizeError,
  UnknownBaseError,
} from './index.js';

const text = (bytes: Uint8Array): string => new TextDecoder().decode(bytes);
const hex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const readI64 = (bytes: Uint8Array): bigint =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.length).getBigInt64(0);

describe('Function API', () => {
  test('encode/decode round-trip with base name', () => {
    const buffer = Buffer.from('Hello, World!', 'utf8');
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58');
    expect(text(decoded)).toBe('Hello, World!');
  });

  test('encode/decode with custom character set', () => {
    const spec = { alphabet: Chars.Base58, algorithm: 'radix' } as const;
    const buffer = Buffer.from('Test', 'utf8');
    const encoded = encode(buffer, spec);
    const decoded = decode(encoded, spec);
    expect(text(decoded)).toBe('Test');
  });

  test('a bare alphabet is no longer accepted as a base', () => {
    expect(() => encode(Buffer.from('Test'), Chars.Base58 as never)).toThrow(UnknownBaseError);
  });

  test('convert between bases', () => {
    const buffer = Buffer.from('Hello', 'utf8');
    const base58Encoded = encode(buffer, 'base58');
    const converted = convert(base58Encoded, 'base58', 'base64url');
    const expected = encode(buffer, 'base64url');
    expect(converted).toBe(expected);
  });

  test('validate returns true for valid input', () => {
    expect(validate('9Ajdvz', 'base58')).toBe(true);
  });

  test('validate returns false for invalid input', () => {
    expect(validate('0Ajdvz', 'base58')).toBe(false);
  });

  test('decode with size option pads buffer', () => {
    const buffer = Buffer.from([1, 2, 3]);
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58', { size: 8 });
    expect(decoded.length).toBe(8);
    expect(decoded).toEqual(Buffer.from([0, 0, 0, 0, 0, 1, 2, 3]));
  });

  test('decode with size option throws on overflow', () => {
    const buffer = Buffer.from([1, 2, 3, 4, 5]);
    const encoded = encode(buffer, 'base58');
    expect(() => {
      decode(encoded, 'base58', { size: 3 });
    }).toThrow(BufferSizeError);
  });

  test('throws UnknownBaseError for invalid base name', () => {
    expect(() => {
      encode(Buffer.from('test'), 'invalid');
    }).toThrow(UnknownBaseError);
  });
});

describe('Codecs object', () => {
  test('Codecs.base58.encode/decode round-trip', () => {
    const buffer = Buffer.from('Hello, World!', 'utf8');
    const encoded = Codecs.base58.encode(buffer);
    const decoded = Codecs.base58.decode(encoded);
    expect(text(decoded)).toBe('Hello, World!');
  });

  test('Codecs.base64url.encode/decode round-trip', () => {
    const buffer = Buffer.from('Hello, World!', 'utf8');
    const encoded = Codecs.base64url.encode(buffer);
    const decoded = Codecs.base64url.decode(encoded);
    expect(text(decoded)).toBe('Hello, World!');
  });

  test('Codecs.base58.convertTo', () => {
    const buffer = Buffer.from('Test', 'utf8');
    const base58Encoded = Codecs.base58.encode(buffer);
    const converted = Codecs.base58.convertTo(Codecs.base64url, base58Encoded);
    expect(converted).toBe(Codecs.base64url.encode(buffer));
  });

  test('Codecs.base58.validate', () => {
    expect(Codecs.base58.validate('123abc')).toBe(true);
    expect(Codecs.base58.validate('0abc')).toBe(false);
  });
});

describe('createCodec', () => {
  test('creates custom codec', () => {
    const binary = createCodec('01');
    const buffer = Buffer.from([5]);
    const encoded = binary.encode(buffer);
    expect(encoded).toBe('101');
    const decoded = binary.decode(encoded);
    expect(decoded).toEqual(Buffer.from([5]));
  });
});

describe('Edge cases', () => {
  test('empty buffer', () => {
    const buffer = Buffer.alloc(0);
    const encoded = encode(buffer, 'base58');
    expect(encoded).toBe('');
    const decoded = decode(encoded, 'base58');
    expect(decoded.length).toBe(0);
  });

  test('empty string with size option', () => {
    const decoded = decode('', 'base58', { size: 4 });
    expect(decoded).toEqual(Buffer.from([0, 0, 0, 0]));
  });

  test('leading zero bytes preserved', () => {
    const buffer = Buffer.from([0, 0, 1, 2, 3]);
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58');
    expect(decoded).toEqual(buffer);
  });

  test('multiple leading zeros', () => {
    const buffer = Buffer.from([0, 0, 0, 0, 255]);
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58');
    expect(decoded).toEqual(buffer);
  });

  test('all zeros', () => {
    const buffer = Buffer.from([0, 0, 0]);
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58');
    expect(decoded).toEqual(buffer);
  });

  test('single byte values', () => {
    for (let i = 0; i < 256; i++) {
      const buffer = Buffer.from([i]);
      const encoded = encode(buffer, 'base58');
      const decoded = decode(encoded, 'base58');
      expect(decoded).toEqual(buffer);
    }
  });

  test('long buffer', () => {
    const buffer = Buffer.from('Hello, World!'.repeat(100), 'utf8');
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58');
    expect(text(decoded)).toBe('Hello, World!'.repeat(100));
  });

  test('binary powers from 0 to 63', () => {
    for (let i = 0; i < 64; i++) {
      const buffer = Buffer.alloc(8);
      const num = BigInt(2) ** BigInt(i) - BigInt(1);
      buffer.writeBigInt64BE(num);
      const encoded = encode(buffer, 'base58');
      const decoded = decode(encoded, 'base58', { size: 8 });
      const result = readI64(decoded);
      expect(result).toBe(num);
    }
  });
});

describe('All character sets', () => {
  const baseNames = [
    'decimal',
    'base16',
    'hex',
    'base32',
    'base32crockford',
    'base36',
    'base52',
    'base58',
    'base64',
    'base64url',
    'base32hex',
    'ascii85',
    'z85',
  ] as const;

  // 12 bytes, so that z85 (whole 4-byte blocks only) is covered by the loop.
  const payload = 'Hello, World';

  for (const base of baseNames) {
    test(`${base} encode/decode round-trip`, () => {
      const buffer = Buffer.from(payload, 'utf8');
      const encoded = encode(buffer, base);
      const decoded = decode(encoded, base);
      expect(text(decoded)).toBe(payload);
    });
  }
});

describe('Error handling', () => {
  test('InvalidCharacterError on decode', () => {
    expect(() => {
      decode('Invalid!String', 'base58');
    }).toThrow(InvalidCharacterError);
  });

  test('InvalidCharacterError includes character', () => {
    try {
      decode('abc!def', 'base58');
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidCharacterError);
      expect((e as Error).message).toContain('!');
    }
  });
});

describe('Uint8Array support', () => {
  test('encode Uint8Array with function API', () => {
    const uint8Array = new Uint8Array([72, 101, 108, 108, 111]); // 'Hello'
    const buffer = Buffer.from('Hello', 'utf8');

    const encodedFromUint8 = encode(uint8Array, 'base58');
    const encodedFromBuffer = encode(buffer, 'base58');

    expect(encodedFromUint8).toBe(encodedFromBuffer);
  });

  test('encode Uint8Array with Codecs object', () => {
    const uint8Array = new Uint8Array([72, 101, 108, 108, 111]); // 'Hello'
    const buffer = Buffer.from('Hello', 'utf8');

    const encodedFromUint8 = Codecs.base58.encode(uint8Array);
    const encodedFromBuffer = Codecs.base58.encode(buffer);

    expect(encodedFromUint8).toBe(encodedFromBuffer);
  });

  test('encode empty Uint8Array', () => {
    const uint8Array = new Uint8Array(0);
    const encoded = encode(uint8Array, 'base58');
    expect(encoded).toBe('');
  });

  test('encode Uint8Array with leading zeros', () => {
    const uint8Array = new Uint8Array([0, 0, 1, 2, 3]);
    const encoded = encode(uint8Array, 'base58');
    const decoded = decode(encoded, 'base58');
    expect(Array.from(decoded)).toEqual([0, 0, 1, 2, 3]);
  });

  test('encode Uint8Array all zeros', () => {
    const uint8Array = new Uint8Array([0, 0, 0]);
    const encoded = encode(uint8Array, 'base58');
    const decoded = decode(encoded, 'base58');
    expect(Array.from(decoded)).toEqual([0, 0, 0]);
  });

  test('encode Uint8Array across all base encodings', () => {
    const uint8Array = new Uint8Array([1, 2, 3, 4]);
    const buffer = Buffer.from([1, 2, 3, 4]);

    const baseNames = [
      'decimal', 'base16', 'hex', 'base32', 'base32hex', 'base32crockford',
      'base36', 'base52', 'base58', 'base64', 'base64url',
      'ascii85', 'z85',
    ] as const;

    for (const base of baseNames) {
      const encodedFromUint8 = encode(uint8Array, base);
      const encodedFromBuffer = encode(buffer, base);
      expect(encodedFromUint8).toBe(encodedFromBuffer);
    }
  });

  test('custom codec with Uint8Array', () => {
    const binary = createCodec('01');
    const uint8Array = new Uint8Array([5]);
    const encoded = binary.encode(uint8Array);
    expect(encoded).toBe('101');
  });
});

describe('Backward compatibility', () => {
  test('BufferEncoder works', async () => {
    const { BufferEncoder, Chars } = await import('./bufferbase.js');
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.from('Hello', 'utf8');
    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded);
    expect(text(decoded)).toBe('Hello');
  });

  test('BufferEncoder with bufferSize', async () => {
    const { BufferEncoder, Chars } = await import('./bufferbase.js');
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.alloc(0);
    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded, 4);
    expect(hex(decoded)).toBe('00000000');
  });

  test('Converter works', async () => {
    const { BufferEncoder, Converter, Chars } = await import('./bufferbase.js');
    const converter = new Converter(Chars.Base58, Chars.Base64);
    const buffer = Buffer.from('Test', 'utf8');
    const base58Encoded = new BufferEncoder(Chars.Base58).encode(buffer);
    const converted = converter.convert(base58Encoded);
    const expected = new BufferEncoder(Chars.Base64).encode(buffer);
    expect(converted).toBe(expected);
  });

  test('Validator works', async () => {
    const { Validator, Chars } = await import('./bufferbase.js');
    const validator = new Validator(Chars.Base58);
    expect(validator.validate('123abc')).toBe(true);
    expect(validator.validate('0abc')).toBe(false);
  });
});
