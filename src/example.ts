import { Buffer } from 'node:buffer';
import { encode, decode, convert, validate, createCodec, Chars, Codecs } from './index.js';

const bytes = Buffer.from('Hello, World!', 'utf8');

// The same bytes under each algorithm.
console.log('=== Algorithms ===');
console.table({
  'block   base64': encode(bytes, 'base64'),
  'block   base32': encode(bytes, 'base32'),
  'block85 ascii85': encode(bytes, 'ascii85'),
  'radix   base58': encode(bytes, 'base58'),
  'radix   base32crockford': encode(bytes, 'base32crockford'),
});

// Converting goes through the bytes, so any pair works.
console.log('\n=== Function API ===');
const base58 = encode(bytes, 'base58');
const base64url = convert(base58, 'base58', 'base64url');
console.table({
  bytes: bytes.toString('utf8'),
  base58,
  base64url,
  valid: validate(base64url, 'base64url'),
  decoded: decode(base64url, 'base64url').toString('utf8'),
});

// validate() agrees with decode(): it checks length, padding and canonicality.
console.log('\n=== Rejected input ===');
console.table({
  "'Zm8=' (canonical)": validate('Zm8=', 'base64'),
  "'Zm9=' (spare bits set)": validate('Zm9=', 'base64'),
  "'Zm9vd' (5 characters)": validate('Zm9vd', 'base64'),
});

// Crockford's Base32 reads what a person is likely to have written down.
console.log('\n=== Crockford ===');
const crockford = encode(bytes, 'base32crockfordcheck');
console.table({
  encoded: crockford,
  'as typed': decode(`${crockford.slice(0, 4)}-${crockford.slice(4)}`.toLowerCase(), 'base32crockfordcheck').toString('utf8'),
  'one character changed': validate(`${crockford.slice(0, -2)}Z${crockford.slice(-1)}`, 'base32crockfordcheck'),
});

// Codecs, and a custom alphabet.
console.log('\n=== Codecs and custom alphabets ===');
const binary = createCodec('01');
const adobe = createCodec({
  alphabet: Chars.Ascii85,
  algorithm: 'block85',
  zeroShortcut: true,
  delimiters: true,
});
console.table({
  'Codecs.base58': Codecs.base58.encode(bytes),
  'binary of [5]': binary.encode(Uint8Array.of(5)),
  'adobe ascii85': adobe.encode(bytes),
});
