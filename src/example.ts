import { Buffer } from 'node:buffer';
import { encode, decode, convert, validate, Codecs } from './index.js';

// Example buffer
const bytes = Buffer.from('Hello, World!', 'utf8');

// Using simple function API
const base32encoded = encode(bytes, 'base32crockford');
const base58encoded = convert(base32encoded, 'base32crockford', 'base58');
const base64encoded = convert(base58encoded, 'base58', 'base64url');
const isValidAsBase64 = validate(base64encoded, 'base64url');
const decoded = decode(base64encoded, 'base64url');

console.log('=== Function API ===');
console.table({
  bytes: bytes.toString('utf8'),
  base32encoded,
  base58encoded,
  base64encoded,
  isValidAsBase64,
  decoded: decoded.toString('utf8'),
});

// Using Codecs object
console.log('\n=== Codecs API ===');
const encoded = Codecs.base58.encode(bytes);
const converted = Codecs.base58.convertTo(Codecs.base64url, encoded);
console.table({
  original: bytes.toString('utf8'),
  base58: encoded,
  base64url: converted,
  valid: Codecs.base64url.validate(converted),
});
