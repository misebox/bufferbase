import { Codec } from './codec.js';
import { Chars } from './bases.js';

/** Decimal (base 10) codec: 0-9 */
const decimal = new Codec(Chars.Decimal);

/** Hexadecimal (base 16) codec: 0-9A-F */
const base16 = new Codec(Chars.Base16);

/** Alias for base16 */
const hex = base16;

/** Base32 codec: A-Z2-7 */
const base32 = new Codec(Chars.Base32);

/** Base32 Crockford codec: 0-9A-HJKMNP-TV-Z */
const base32crockford = new Codec(Chars.Base32Crockford);

/** Base36 codec: 0-9A-Z */
const base36 = new Codec(Chars.Base36);

/** Base52 codec: A-Za-z */
const base52 = new Codec(Chars.Base52);

/** Base58 (Bitcoin) codec: 1-9A-HJ-NP-Za-km-z */
const base58 = new Codec(Chars.Base58);

/** Standard Base64 codec: A-Za-z0-9+/ */
const base64 = new Codec(Chars.Base64);

/** URL-safe Base64 codec: A-Za-z0-9-_ */
const base64url = new Codec(Chars.Base64Url);

/** XML Base64 codec: A-Za-z0-9._ */
const base64xml = new Codec(Chars.Base64Xml);

/** XML Name Base64 codec: A-Za-z0-9_: */
const base64xmlname = new Codec(Chars.Base64XmlName);

/** ASCII85 codec */
const ascii85 = new Codec(Chars.Ascii85);

/** Base85 codec */
const base85 = new Codec(Chars.Base85);

/** ZeroMQ Z85 codec */
const z85 = new Codec(Chars.Z85);

/**
 * Pre-defined codec instances for common base encodings.
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

export type CodecName = keyof typeof Codecs;
