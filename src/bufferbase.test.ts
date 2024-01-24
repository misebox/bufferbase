import { Chars, BufferEncoder } from './bufferbase.js';
import { Buffer } from 'node:buffer';
import test from 'node:test'; // ①
import assert from 'node:assert';

test('BufferEncoder', async (t) => {
  await t.test(
    'encodes and decodes a string correctly with base58chars',
    () => {
      const encoder = new BufferEncoder(Chars.Base58);
      const buffer = Buffer.from('Hello, World!', 'utf8');

      const encoded = encoder.encode(buffer);
      const decoded = encoder.decode(encoded);

      assert.strictEqual(decoded.toString('utf8'), 'Hello, World!');
    }
  );

  await t.test('handles empty buffer correctly', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.alloc(0);

    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded);

    assert.strictEqual(decoded.toString('utf8'), '');
  });

  await t.test('handles long buffer correctly', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.from('Hello, World!'.repeat(100), 'utf8');

    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded);

    assert.strictEqual(decoded.toString('utf8'), 'Hello, World!'.repeat(100));
  });

  await t.test('handles bufferSize argument correctly', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.alloc(0);

    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded, 4);

    assert.strictEqual(decoded.toString('hex'), '00000000');
  });

  await t.test('encode and decode various chars correctly', () => {
    for (const charTable of Object.values(Chars)) {
      const encoder = new BufferEncoder(charTable);
      const buffer = Buffer.from('Hello, World!', 'utf8');

      const encoded = encoder.encode(buffer);
      const decoded = encoder.decode(encoded);

      assert.strictEqual(decoded.toString('utf8'), 'Hello, World!');
    }
  });

  await t.test('handles binary powers from 1 to 63 correctly', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    for (let i = 0; i < 64; i++) {
      const buffer = Buffer.alloc(8);
      const num = BigInt(2) ** BigInt(i) - BigInt(1);
      buffer.writeBigInt64BE(num);
      const encoded = encoder.encode(buffer);
      const decoded = encoder.decode(encoded, 8);
      const result = decoded.readBigInt64BE();
      console.log(encoded, result);
      assert.strictEqual(result, num);
    }
  });
  await t.test('throws error on invalid characters in decode', () => {
    assert.throws(() => {
      const encoder = new BufferEncoder(Chars.Base58);
      encoder.decode('InvalidString!');
    }, new Error('Invalid character found'));
  });
});
