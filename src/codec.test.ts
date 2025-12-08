import { Buffer } from 'node:buffer';
import test from 'node:test';
import assert from 'node:assert';

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

test('Function API', async (t) => {
  await t.test('encode/decode round-trip with base name', () => {
    const buffer = Buffer.from('Hello, World!', 'utf8');
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58');
    assert.strictEqual(decoded.toString('utf8'), 'Hello, World!');
  });

  await t.test('encode/decode with custom character set', () => {
    const buffer = Buffer.from('Test', 'utf8');
    const encoded = encode(buffer, Chars.Base58);
    const decoded = decode(encoded, Chars.Base58);
    assert.strictEqual(decoded.toString('utf8'), 'Test');
  });

  await t.test('convert between bases', () => {
    const buffer = Buffer.from('Hello', 'utf8');
    const base58Encoded = encode(buffer, 'base58');
    const converted = convert(base58Encoded, 'base58', 'base64url');
    const expected = encode(buffer, 'base64url');
    assert.strictEqual(converted, expected);
  });

  await t.test('validate returns true for valid input', () => {
    assert.strictEqual(validate('9Ajdvz', 'base58'), true);
  });

  await t.test('validate returns false for invalid input', () => {
    assert.strictEqual(validate('0Ajdvz', 'base58'), false); // '0' not in base58
  });

  await t.test('decode with size option pads buffer', () => {
    const buffer = Buffer.from([1, 2, 3]);
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58', { size: 8 });
    assert.strictEqual(decoded.length, 8);
    assert.deepStrictEqual(decoded, Buffer.from([0, 0, 0, 0, 0, 1, 2, 3]));
  });

  await t.test('decode with size option throws on overflow', () => {
    const buffer = Buffer.from([1, 2, 3, 4, 5]);
    const encoded = encode(buffer, 'base58');
    assert.throws(() => {
      decode(encoded, 'base58', { size: 3 });
    }, BufferSizeError);
  });

  await t.test('throws UnknownBaseError for invalid base name', () => {
    assert.throws(() => {
      encode(Buffer.from('test'), 'invalid');
    }, UnknownBaseError);
  });
});

test('Codecs object', async (t) => {
  await t.test('Codecs.base58.encode/decode round-trip', () => {
    const buffer = Buffer.from('Hello, World!', 'utf8');
    const encoded = Codecs.base58.encode(buffer);
    const decoded = Codecs.base58.decode(encoded);
    assert.strictEqual(decoded.toString('utf8'), 'Hello, World!');
  });

  await t.test('Codecs.base64url.encode/decode round-trip', () => {
    const buffer = Buffer.from('Hello, World!', 'utf8');
    const encoded = Codecs.base64url.encode(buffer);
    const decoded = Codecs.base64url.decode(encoded);
    assert.strictEqual(decoded.toString('utf8'), 'Hello, World!');
  });

  await t.test('Codecs.base58.convertTo', () => {
    const buffer = Buffer.from('Test', 'utf8');
    const base58Encoded = Codecs.base58.encode(buffer);
    const converted = Codecs.base58.convertTo(Codecs.base64url, base58Encoded);
    assert.strictEqual(converted, Codecs.base64url.encode(buffer));
  });

  await t.test('Codecs.base58.validate', () => {
    assert.strictEqual(Codecs.base58.validate('123abc'), true);
    assert.strictEqual(Codecs.base58.validate('0abc'), false);
  });
});

test('createCodec', async (t) => {
  await t.test('creates custom codec', () => {
    const binary = createCodec('01');
    const buffer = Buffer.from([5]); // 0b00000101
    const encoded = binary.encode(buffer);
    assert.strictEqual(encoded, '101');
    const decoded = binary.decode(encoded);
    assert.deepStrictEqual(decoded, Buffer.from([5]));
  });
});

test('Edge cases', async (t) => {
  await t.test('empty buffer', () => {
    const buffer = Buffer.alloc(0);
    const encoded = encode(buffer, 'base58');
    assert.strictEqual(encoded, '');
    const decoded = decode(encoded, 'base58');
    assert.strictEqual(decoded.length, 0);
  });

  await t.test('empty string with size option', () => {
    const decoded = decode('', 'base58', { size: 4 });
    assert.deepStrictEqual(decoded, Buffer.from([0, 0, 0, 0]));
  });

  await t.test('leading zero bytes preserved', () => {
    const buffer = Buffer.from([0, 0, 1, 2, 3]);
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58');
    assert.deepStrictEqual(decoded, buffer);
  });

  await t.test('multiple leading zeros', () => {
    const buffer = Buffer.from([0, 0, 0, 0, 255]);
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58');
    assert.deepStrictEqual(decoded, buffer);
  });

  await t.test('all zeros', () => {
    const buffer = Buffer.from([0, 0, 0]);
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58');
    assert.deepStrictEqual(decoded, buffer);
  });

  await t.test('single byte values', () => {
    for (let i = 0; i < 256; i++) {
      const buffer = Buffer.from([i]);
      const encoded = encode(buffer, 'base58');
      const decoded = decode(encoded, 'base58');
      assert.deepStrictEqual(decoded, buffer, `Failed for byte ${i}`);
    }
  });

  await t.test('long buffer', () => {
    const buffer = Buffer.from('Hello, World!'.repeat(100), 'utf8');
    const encoded = encode(buffer, 'base58');
    const decoded = decode(encoded, 'base58');
    assert.strictEqual(decoded.toString('utf8'), 'Hello, World!'.repeat(100));
  });

  await t.test('binary powers from 0 to 63', () => {
    for (let i = 0; i < 64; i++) {
      const buffer = Buffer.alloc(8);
      const num = BigInt(2) ** BigInt(i) - BigInt(1);
      buffer.writeBigInt64BE(num);
      const encoded = encode(buffer, 'base58');
      const decoded = decode(encoded, 'base58', { size: 8 });
      const result = decoded.readBigInt64BE();
      assert.strictEqual(result, num, `Failed for 2^${i} - 1`);
    }
  });
});

test('All character sets', async (t) => {
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
    'ascii85',
    'base85',
    'z85',
  ] as const;

  for (const base of baseNames) {
    await t.test(`${base} encode/decode round-trip`, () => {
      const buffer = Buffer.from('Hello, World!', 'utf8');
      const encoded = encode(buffer, base);
      const decoded = decode(encoded, base);
      assert.strictEqual(decoded.toString('utf8'), 'Hello, World!');
    });
  }
});

test('Error handling', async (t) => {
  await t.test('InvalidCharacterError on decode', () => {
    assert.throws(() => {
      decode('Invalid!String', 'base58');
    }, InvalidCharacterError);
  });

  await t.test('InvalidCharacterError includes character', () => {
    try {
      decode('abc!def', 'base58');
      assert.fail('Should throw');
    } catch (e) {
      assert.ok(e instanceof InvalidCharacterError);
      assert.ok(e.message.includes('!'));
    }
  });
});

test('Backward compatibility', async (t) => {
  const { BufferEncoder, Converter, Validator, Chars } = await import('./bufferbase.js');

  await t.test('BufferEncoder works', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.from('Hello', 'utf8');
    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded);
    assert.strictEqual(decoded.toString('utf8'), 'Hello');
  });

  await t.test('BufferEncoder with bufferSize', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.alloc(0);
    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded, 4);
    assert.strictEqual(decoded.toString('hex'), '00000000');
  });

  await t.test('Converter works', () => {
    const converter = new Converter(Chars.Base58, Chars.Base64);
    const buffer = Buffer.from('Test', 'utf8');
    const base58Encoded = new BufferEncoder(Chars.Base58).encode(buffer);
    const converted = converter.convert(base58Encoded);
    const expected = new BufferEncoder(Chars.Base64).encode(buffer);
    assert.strictEqual(converted, expected);
  });

  await t.test('Validator works', () => {
    const validator = new Validator(Chars.Base58);
    assert.strictEqual(validator.validate('123abc'), true);
    assert.strictEqual(validator.validate('0abc'), false);
  });
});
