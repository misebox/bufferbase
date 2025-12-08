import { Buffer } from 'node:buffer';

/**
 * Supported base encoding names.
 *
 * These names can be used with the function API:
 * - `'decimal'` - Base 10 (0-9)
 * - `'base16'` / `'hex'` - Hexadecimal (0-9A-F)
 * - `'base32'` - RFC 4648 Base32 (A-Z2-7)
 * - `'base32crockford'` - Crockford's Base32 (0-9A-HJKMNP-TV-Z)
 * - `'base36'` - Alphanumeric (0-9A-Z)
 * - `'base52'` - Letters only (A-Za-z)
 * - `'base58'` - Bitcoin alphabet (no 0OIl)
 * - `'base64'` - Standard Base64 (A-Za-z0-9+/)
 * - `'base64url'` - URL-safe Base64 (A-Za-z0-9-_)
 * - `'base64xml'` - XML token Base64 (A-Za-z0-9._)
 * - `'base64xmlname'` - XML name Base64 (A-Za-z0-9_:)
 * - `'ascii85'` - ASCII85 encoding
 * - `'base85'` - Base85 encoding
 * - `'z85'` - ZeroMQ Z85 encoding
 *
 * @example
 * ```typescript
 * import { encode, decode } from 'bufferbase';
 *
 * const encoded = encode(Buffer.from('Hello'), 'base58');
 * const decoded = decode(encoded, 'base58');
 * ```
 */
export type BaseName =
  | 'decimal'
  | 'base16'
  | 'hex'
  | 'base32'
  | 'base32crockford'
  | 'base36'
  | 'base52'
  | 'base58'
  | 'base64'
  | 'base64url'
  | 'base64xml'
  | 'base64xmlname'
  | 'ascii85'
  | 'base85'
  | 'z85';

/**
 * Options for decode operations.
 *
 * @example
 * ```typescript
 * // Decode with fixed buffer size (pads with leading zeros)
 * const buffer = decode(encoded, 'base58', { size: 32 });
 * ```
 */
export interface DecodeOptions {
  /**
   * Expected buffer size in bytes.
   * - If decoded result is smaller, pads with leading zeros.
   * - If decoded result is larger, throws `BufferSizeError`.
   */
  size?: number;
}

/**
 * Codec interface for encoding/decoding operations.
 *
 * Implemented by the `Codec` class and used by pre-defined codecs in `Codecs`.
 *
 * @example
 * ```typescript
 * import { Codecs } from 'bufferbase';
 *
 * const encoded = Codecs.base58.encode(Buffer.from('Hello'));
 * const decoded = Codecs.base58.decode(encoded);
 * ```
 */
export interface ICodec {
  /** Character set used for encoding. */
  readonly chars: string;

  /**
   * Encodes a buffer to a base-encoded string.
   * @param buffer - The buffer to encode
   * @returns Base-encoded string
   */
  encode(buffer: Buffer): string;

  /**
   * Decodes a base-encoded string to a buffer.
   * @param encoded - The string to decode
   * @param options - Decode options (e.g., fixed size)
   * @returns Decoded buffer
   * @throws {InvalidCharacterError} If the string contains invalid characters
   * @throws {BufferSizeError} If the result exceeds the specified size
   */
  decode(encoded: string, options?: DecodeOptions): Buffer;

  /**
   * Validates if a string contains only valid characters for this base.
   * @param input - The string to validate
   * @returns `true` if valid, `false` otherwise
   */
  validate(input: string): boolean;

  /**
   * Converts a string from this base to another base.
   * @param target - Target codec to convert to
   * @param input - The string to convert
   * @returns String in the target base encoding
   */
  convertTo(target: ICodec, input: string): string;
}
