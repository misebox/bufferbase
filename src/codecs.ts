import type { ICodec } from './types.js';
import { Bases, type BaseName } from './bases.js';
import { getCodec } from './codec.js';

/**
 * A ready-made codec for every name in `Bases`.
 *
 * @example
 * ```typescript
 * import { Codecs } from 'bufferbase';
 *
 * Codecs.base58.encode(Buffer.from('Hello'));      // '9Ajdvzr'
 * Codecs.base64.encode(Buffer.from('fo'));         // 'Zm8='
 * Codecs.base58.convertTo(Codecs.base64url, '9Ajdvzr');
 * ```
 */
export const Codecs = Object.fromEntries(
  Object.entries(Bases).map(([name, spec]) => [name, getCodec(spec)]),
) as Record<BaseName, ICodec>;

/**
 * Type representing valid codec names in the `Codecs` object.
 */
export type CodecName = BaseName;
