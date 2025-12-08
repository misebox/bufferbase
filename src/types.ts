import { Buffer } from 'node:buffer';

/**
 * Supported base encoding names.
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
 */
export interface DecodeOptions {
  /** Expected buffer size. Pads with zeros if result is smaller, throws if larger. */
  size?: number;
}

/**
 * Codec interface for encoding/decoding operations.
 */
export interface ICodec {
  /** Character set used for encoding. */
  readonly chars: string;

  /** Encodes a buffer to a base-encoded string. */
  encode(buffer: Buffer): string;

  /** Decodes a base-encoded string to a buffer. */
  decode(encoded: string, options?: DecodeOptions): Buffer;

  /** Validates if a string contains only valid characters for this base. */
  validate(input: string): boolean;

  /** Converts a string from this base to another base. */
  convertTo(target: ICodec, input: string): string;
}
