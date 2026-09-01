import type { CodecSpec, ICodec } from './types.js';
import { RadixCodec } from './codec-radix.js';
import { BlockCodec } from './codec-block.js';
import { Block85Codec } from './codec-block85.js';

/**
 * Builds the codec described by a spec.
 *
 * A bare string is read as a custom alphabet for a radix conversion, which is
 * the only algorithm that works with an alphabet of any length.
 *
 * @example
 * ```typescript
 * import { createCodec } from 'bufferbase';
 *
 * const binary = createCodec('01');
 * binary.encode(Uint8Array.of(5)); // '101'
 *
 * const paddedHex = createCodec({ alphabet: '0123456789abcdef', algorithm: 'block' });
 * paddedHex.encode(Uint8Array.of(0, 1)); // '0001'
 * ```
 */
export function createCodec(spec: CodecSpec | string): ICodec {
  const resolved: CodecSpec =
    typeof spec === 'string' ? { alphabet: spec, algorithm: 'radix' } : spec;

  switch (resolved.algorithm) {
    case 'radix':
      return new RadixCodec(resolved);
    case 'block':
      return new BlockCodec(resolved);
    case 'block85':
      return new Block85Codec(resolved);
  }
}

const cache = new WeakMap<CodecSpec, ICodec>();

/**
 * Returns the codec for a spec, building it once per spec object.
 *
 * Named bases always resolve to the same spec object, so they are built once
 * for the lifetime of the process.
 */
export function getCodec(spec: CodecSpec): ICodec {
  const cached = cache.get(spec);
  if (cached !== undefined) {
    return cached;
  }
  const codec = createCodec(spec);
  cache.set(spec, codec);
  return codec;
}

export { RadixCodec } from './codec-radix.js';
export { BlockCodec } from './codec-block.js';
export { Block85Codec } from './codec-block85.js';
