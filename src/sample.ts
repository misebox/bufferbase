import { Chars, BufferEncoder, Converter, validate } from "./bufferbase";

// Example buffer
const bytes = Buffer.from("Hello, World!", "utf8");

// Encoding buffer to Base32
const encoder = new BufferEncoder(Chars.Base32Crockford);
const base32encoded = encoder.encode(bytes);

// Converting Base32 to Base58
const converter_32to58 = new Converter(Chars.Base32Crockford, Chars.Base58);
const base58encoded = converter_32to58.convert(base32encoded);

// Converting Base32 to Base58
const converter_58to64 = new Converter(Chars.Base58, Chars.Base64_URL_SAFE);
const base64encoded = converter_58to64.convert(base58encoded);

// Validating Base64
const validatorB64 = new Validator(Chars.Base64_URL_SAFE);
const isBase64 = validator.validate(base64encoded);

// Decoding Base64
const decoder = new BufferEncoder(Chars.Base64_URL_SAFE);
const decoded = decoder.decode(base64encoded);

console.table({
  bytes: bytes.toString("utf8"),
  base32encoded,
  base58encoded,
  base64encoded,
  isBase64,
  decoded: decoded.toString("utf8"),
});
// ┌───────────────┬─────────────────────────┐
// │    (index)    │         Values          │
// ├───────────────┼─────────────────────────┤
// │     bytes     │     'Hello, World!'     │
// │ base32encoded │ '4GSBCDHQJR82QDXS6RS11' │
// │ base58encoded │  '72k1xXWG59fYdzSNoA'   │
// │ base64encoded │  'BIZWxsbywgV29ybGQh'   │
// │    decoded    │     'Hello, World!'     │
// │   isBase64    │          true           │
// └───────────────┴─────────────────────────┘
