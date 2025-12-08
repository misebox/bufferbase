import { Codec } from './codec.js';
import { Chars } from './bases.js';

/** Decimal (base 10) codec: 0-9 */
const decimal = new Codec(Chars.Decimal);

/** Hexadecimal (base 16) codec: 0-9A-F */
const base16 = new Codec(Chars.Base16);

/** Alias for base16 */
const hex = base16;

/** RFC 4648 Base32 codec: A-Z2-7 */
const base32 = new Codec(Chars.Base32);

/** Crockford's Base32 codec: 0-9A-HJKMNP-TV-Z (no I, L, O, U) */
const base32crockford = new Codec(Chars.Base32Crockford);

/** Base36 codec: 0-9A-Z */
const base36 = new Codec(Chars.Base36);

/** Base52 codec: A-Za-z (letters only) */
const base52 = new Codec(Chars.Base52);

/** Bitcoin Base58 codec: 1-9A-HJ-NP-Za-km-z (no 0, O, I, l) */
const base58 = new Codec(Chars.Base58);

/** Standard Base64 codec: A-Za-z0-9+/ */
const base64 = new Codec(Chars.Base64);

/** URL-safe Base64 codec: A-Za-z0-9-_ */
const base64url = new Codec(Chars.Base64Url);

/** XML token Base64 codec: A-Za-z0-9._ */
const base64xml = new Codec(Chars.Base64Xml);

/** XML name Base64 codec: A-Za-z0-9_: */
const base64xmlname = new Codec(Chars.Base64XmlName);

/** ASCII85 codec */
const ascii85 = new Codec(Chars.Ascii85);

/** Base85 codec */
const base85 = new Codec(Chars.Base85);

/** ZeroMQ Z85 codec */
const z85 = new Codec(Chars.Z85);

/**
 * Pre-defined codec instances for common base encodings.
 *
 * Use these for encoding/decoding without creating codec instances manually.
 * Each codec provides `encode()`, `decode()`, `validate()`, and `convertTo()` methods.
 *
 * @example
 * ```typescript
 * import { Codecs } from 'bufferbase';
 *
 * // Encode to Base58
 * const encoded = Codecs.base58.encode(Buffer.from('Hello'));
 *
 * // Decode from Base58
 * const decoded = Codecs.base58.decode(encoded);
 *
 * // Convert between bases
 * const base64 = Codecs.base58.convertTo(Codecs.base64url, encoded);
 *
 * // Validate
 * Codecs.base58.validate(encoded); // true
 * ```
 *
 * Available codecs:
 * - `decimal` - Base 10 (0-9)
 * - `base16` / `hex` - Hexadecimal (0-9A-F)
 * - `base32` - RFC 4648 Base32 (A-Z2-7)
 * - `base32crockford` - Crockford's Base32
 * - `base36` - Alphanumeric (0-9A-Z)
 * - `base52` - Letters only (A-Za-z)
 * - `base58` - Bitcoin alphabet
 * - `base64` - Standard Base64
 * - `base64url` - URL-safe Base64
 * - `base64xml` - XML token Base64
 * - `base64xmlname` - XML name Base64
 * - `ascii85` - ASCII85 encoding
 * - `base85` - Base85 encoding
 * - `z85` - ZeroMQ Z85 encoding
 */
export const Codecs = {
  decimal,
  base16,
  hex,
  base32,
  base32crockford,
  base36,
  base52,
  base58,
  base64,
  base64url,
  base64xml,
  base64xmlname,
  ascii85,
  base85,
  z85,
} as const;

/**
 * Type representing valid codec names in the `Codecs` object.
 *
 * @example
 * ```typescript
 * import { Codecs, CodecName } from 'bufferbase';
 *
 * function getCodec(name: CodecName) {
 *   return Codecs[name];
 * }
 * ```
 */
export type CodecName = keyof typeof Codecs;
