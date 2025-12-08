// Types
export type { BaseName, DecodeOptions, ICodec, BufferLike } from './types.js';
export type { CodecName } from './codecs.js';

// Errors
export { InvalidCharacterError, BufferSizeError, UnknownBaseError } from './errors.js';

// Codec class and factory
export { Codec, createCodec } from './codec.js';

// Character sets and utilities
export { Chars, resolveChars, isBaseName } from './bases.js';

// Simple function API
export { encode, decode, convert, validate } from './functions.js';

// Pre-defined codecs (namespaced)
export { Codecs } from './codecs.js';

// Deprecated exports for backward compatibility
export { BufferEncoder, Converter, Validator } from './bufferbase.js';
