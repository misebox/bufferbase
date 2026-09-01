// Types
export type {
  Algorithm,
  Block85Spec,
  BlockSpec,
  Bytes,
  CodecSpec,
  DecodeOptions,
  ICodec,
  RadixSpec,
} from './types.js';
export type { BaseName } from './bases.js';
export type { Base } from './functions.js';
export type { CodecName } from './codecs.js';

// Errors
export {
  BufferSizeError,
  CheckSymbolError,
  InvalidCharacterError,
  InvalidCodecError,
  InvalidLengthError,
  NonCanonicalError,
  UnknownBaseError,
  ValueRangeError,
} from './errors.js';

// Codec implementations and factory
export { Block85Codec, BlockCodec, RadixCodec, createCodec, getCodec } from './codec.js';

// Character sets, encoding definitions, and lookup helpers
export { Bases, Chars, isBaseName, resolveSpec } from './bases.js';

// Simple function API
export { convert, decode, encode, validate } from './functions.js';

// Pre-defined codecs (namespaced)
export { Codecs } from './codecs.js';
