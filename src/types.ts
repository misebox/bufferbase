/**
 * Input type accepted by encode functions.
 *
 * A Node.js `Buffer` is a `Uint8Array`, so both are accepted.
 */
export type BufferLike = Uint8Array;

/**
 * How bytes are mapped to characters.
 *
 * An alphabet alone does not determine an encoding: the same 64 characters can
 * be used by a radix conversion or by a bit-block encoding, producing different
 * output. Every codec therefore names its algorithm explicitly.
 *
 * - `'radix'` — treats the whole buffer as one big integer and rewrites it in
 *   base `alphabet.length`. Works with any alphabet and any input length.
 *   Leading zero bytes are preserved as leading `alphabet[0]` characters.
 *   Used by Base58, Base36, and custom alphabets. Not RFC 4648.
 * - `'block'` — regroups the bit stream into `log2(alphabet.length)`-bit chunks,
 *   as specified by RFC 4648. Requires an alphabet of 2, 4, 8, 16, 32, or 64
 *   characters. Used by Base16, Base32, and Base64.
 * - `'block85'` — converts each 4-byte block to 5 characters (85^5 > 2^32).
 *   Requires an alphabet of exactly 85 characters. Used by Ascii85 and Z85.
 */
export type Algorithm = 'radix' | 'block' | 'block85';

/** Options shared by every algorithm. */
interface CommonSpec {
  /** Characters used for encoding, ordered by value. */
  readonly alphabet: string;
  /**
   * Reject input that is well-formed but not the canonical encoding of any
   * byte sequence (RFC 4648 §3.5). Defaults to `true`.
   *
   * With `strict: false`, `'Zm9='` and `'Zm8='` both decode to `'fo'`, so
   * decoding is no longer injective. Only disable it to read data produced by
   * a lenient encoder.
   */
  readonly strict?: boolean;
  /**
   * Accept either letter case when decoding, and when validating.
   * Requires an alphabet that does not contain both cases of the same letter.
   * Defaults to `false`.
   */
  readonly caseInsensitive?: boolean;
  /**
   * Extra characters accepted when decoding, each mapped to the alphabet
   * character it stands for.
   *
   * Crockford's Base32 uses `{ I: '1', L: '1', O: '0' }` so that a symbol
   * written down by hand is read back as the digit it resembles. Encoding
   * never emits them.
   */
  readonly aliases?: Readonly<Record<string, string>>;
  /**
   * Characters skipped when decoding, such as the hyphens Crockford's Base32
   * allows for readability. Encoding never emits them.
   */
  readonly ignore?: string;
}

/** A codec that rewrites the buffer as an integer in base `alphabet.length`. */
export interface RadixSpec extends CommonSpec {
  readonly algorithm: 'radix';
  /**
   * Symbols that extend the alphabet for a trailing check symbol, which
   * encodes the value modulo `alphabet.length + checkSymbols.length`.
   *
   * Crockford's Base32 uses `'*~$=U'`, giving a modulus of 37. When set, every
   * encoding carries the symbol and every decoding verifies it.
   */
  readonly checkSymbols?: string;
}

/** A codec that regroups the bit stream, as specified by RFC 4648. */
export interface BlockSpec extends CommonSpec {
  readonly algorithm: 'block';
  /**
   * Character used to pad the final block to a whole number of characters,
   * or `false` to emit no padding. Defaults to `'='`.
   */
  readonly pad?: string | false;
}

/** A codec that converts each 4-byte block to 5 characters. */
export interface Block85Spec extends CommonSpec {
  readonly algorithm: 'block85';
  /** Write a block of four zero bytes as `'z'`. Defaults to `false`. */
  readonly zeroShortcut?: boolean;
  /** Write a block of four spaces as `'y'`. Defaults to `false`. */
  readonly spaceShortcut?: boolean;
  /** Wrap the output in `'<~'` and `'~>'`. Defaults to `false`. */
  readonly delimiters?: boolean;
  /**
   * Require the input length to be a multiple of 4 bytes, as Z85 does.
   * Defaults to `false`, which encodes a trailing partial block as
   * `length + 1` characters.
   */
  readonly requireFullBlocks?: boolean;
}

/**
 * A complete codec definition: an alphabet plus the algorithm that uses it.
 *
 * @example
 * ```typescript
 * import { encode, type CodecSpec } from 'bufferbase';
 *
 * const binary: CodecSpec = { alphabet: '01', algorithm: 'radix' };
 * encode(Uint8Array.of(5), binary); // '101'
 * ```
 */
export type CodecSpec = RadixSpec | BlockSpec | Block85Spec;

/**
 * Options for decode operations.
 */
export interface DecodeOptions {
  /**
   * Required byte length of the result.
   *
   * The decoded buffer must be exactly this long, otherwise `BufferSizeError`
   * is thrown. Because leading zeros carry no value in a radix encoding, a
   * `'radix'` codec pads a shorter result with leading zero bytes to reach it;
   * `'block'` and `'block85'` codecs derive the length from the input and can
   * only check it.
   */
  size?: number;
}

/**
 * Codec interface for encoding/decoding operations.
 *
 * `validate(input)` returns `true` exactly when `decode(input)` succeeds.
 */
export interface ICodec {
  /** Character set used for encoding. */
  readonly chars: string;

  /** The algorithm this codec applies to `chars`. */
  readonly algorithm: Algorithm;

  /** Encodes a buffer to a base-encoded string. */
  encode(buffer: BufferLike): string;

  /** Decodes a base-encoded string to bytes. */
  decode(encoded: string, options?: DecodeOptions): Uint8Array;

  /** Reports whether `decode` would succeed for this input. */
  validate(input: string): boolean;

  /** Decodes with this codec, then re-encodes with `target`. */
  convertTo(target: ICodec, input: string): string;
}
