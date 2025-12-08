import { Chars, BufferEncoder } from './bufferbase.js';
import { Buffer } from 'node:buffer';
import { describe, test, expect } from 'bun:test';

describe('BufferEncoder', () => {
  test('encodes and decodes a string correctly with base58chars', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.from('Hello, World!', 'utf8');

    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded);

    expect(decoded.toString('utf8')).toBe('Hello, World!');
  });

  test('handles empty buffer correctly', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.alloc(0);

    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded);

    expect(decoded.toString('utf8')).toBe('');
  });

  test('handles long buffer correctly', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.from('Hello, World!'.repeat(100), 'utf8');

    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded);

    expect(decoded.toString('utf8')).toBe('Hello, World!'.repeat(100));
  });

  test('handles bufferSize argument correctly', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.alloc(0);

    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded, 4);

    expect(decoded.toString('hex')).toBe('00000000');
  });

  test('encode and decode various chars correctly', () => {
    for (const charTable of Object.values(Chars)) {
      const encoder = new BufferEncoder(charTable);
      const buffer = Buffer.from('Hello, World!', 'utf8');

      const encoded = encoder.encode(buffer);
      const decoded = encoder.decode(encoded);

      expect(decoded.toString('utf8')).toBe('Hello, World!');
    }
  });

  test('handles binary powers from 1 to 63 correctly', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    for (let i = 0; i < 64; i++) {
      const buffer = Buffer.alloc(8);
      const num = BigInt(2) ** BigInt(i) - BigInt(1);
      buffer.writeBigInt64BE(num);
      const encoded = encoder.encode(buffer);
      const decoded = encoder.decode(encoded, 8);
      const result = decoded.readBigInt64BE();
      expect(result).toBe(num);
    }
  });

  test('throws error on invalid characters in decode', () => {
    expect(() => {
      const encoder = new BufferEncoder(Chars.Base58);
      encoder.decode('InvalidString!');
    }).toThrow(/Invalid character found/);
  });

  test('encodes Uint8Array correctly', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const uint8Array = new Uint8Array([72, 101, 108, 108, 111]); // 'Hello'
    const buffer = Buffer.from('Hello', 'utf8');

    const encodedFromUint8 = encoder.encode(uint8Array);
    const encodedFromBuffer = encoder.encode(buffer);

    expect(encodedFromUint8).toBe(encodedFromBuffer);
  });

  test('encodes Uint8Array with leading zeros correctly', () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const uint8Array = new Uint8Array([0, 0, 1, 2, 3]);

    const encoded = encoder.encode(uint8Array);
    const decoded = encoder.decode(encoded);

    expect(Array.from(decoded)).toEqual([0, 0, 1, 2, 3]);
  });
});
