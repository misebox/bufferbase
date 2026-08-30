# bufferbase

Buffer-to-BaseN encoding for Node.js and the browser, across three algorithms:
RFC 4648 bit-block encodings, Ascii85/Z85, and Base58-style radix conversion.

## Installation

```bash
npm install bufferbase
```

## The three algorithms

An alphabet does not describe an encoding on its own. The same 64 characters
can be read as a radix conversion or as a bit-block encoding, and the two
produce different strings for the same bytes. Every codec here therefore names
its algorithm.

| Algorithm | How it works | Alphabet | Used by |
|---|---|---|---|
| `block` | Regroups the bit stream into `log2(n)`-bit chunks, per RFC 4648 | 2, 4, 8, 16, 32, or 64 characters | Base16, Base32, Base64 |
| `block85` | Converts each 4-byte block to 5 characters | exactly 85 characters | Ascii85, Z85 |
| `radix` | Reads the buffer as one integer and rewrites it in base `n` | any length | Base58, Base36, Crockford |

```typescript
import { encode } from 'bufferbase';

encode(Buffer.from('fo'), 'base64');  // 'Zm8='  — RFC 4648
encode(Buffer.from('fo'), 'radix64'); // 'GZv'   — radix conversion
```

Only `radix` accepts an alphabet of any length, and only `radix` preserves
leading zero bytes as leading characters. Only `block` and `block85` have an
output length that is a fixed function of the input length.

## Supported encodings

| Name | Algorithm | Characters | Notes |
|---|---|---|---|
| `base16`, `hex` | `block` | 0-9A-F | RFC 4648 Table 5, unpadded |
| `base32` | `block` | A-Z2-7 | RFC 4648 Table 3 |
| `base32hex` | `block` | 0-9A-V | RFC 4648 Table 4 |
| `base64` | `block` | A-Za-z0-9+/ | RFC 4648 Table 1 |
| `base64url` | `block` | A-Za-z0-9-_ | RFC 4648 Table 2, unpadded |
| `base64xml` | `block` | A-Za-z0-9._ | unpadded |
| `base64xmlname` | `block` | A-Za-z0-9_: | unpadded |
| `ascii85` | `block85` | `!` to `u` | zero-block shortcut on |
| `z85` | `block85` | ZeroMQ RFC 32 | whole 4-byte blocks only |
| `base58` | `radix` | Bitcoin alphabet | |
| `base32crockford` | `radix` | 0-9A-HJKMNP-TV-Z | |
| `base32crockfordcheck` | `radix` | as above, plus `*~$=U` | carries a check symbol |
| `base36` | `radix` | 0-9A-Z | case-insensitive |
| `base52` | `radix` | A-Za-z | |
| `decimal` | `radix` | 0-9 | |
| `radix16`, `radix32`, `radix64`, `radix64url` | `radix` | the RFC alphabets | radix conversion, not RFC 4648 |

Base16, Base32, Base32hex, Base36 and both Crockford codecs decode in either
case.

## Usage

### Functions

```typescript
import { encode, decode, convert, validate } from 'bufferbase';

encode(Buffer.from('Hello'), 'base58');       // '9Ajdvzr'
decode('9Ajdvzr', 'base58');                  // Buffer('Hello')
decode('9Ajdvzr', 'base58', { size: 32 });    // padded to 32 bytes
convert('9Ajdvzr', 'base58', 'base64url');    // through the bytes
validate('Zm8=', 'base64');                   // true
```

`validate(input, base)` returns `true` exactly when `decode(input, base)`
succeeds, so the two never disagree.

### Codecs

```typescript
import { Codecs } from 'bufferbase';

Codecs.base64.encode(Buffer.from('fo'));      // 'Zm8='
Codecs.base58.convertTo(Codecs.base64url, '9Ajdvzr');
```

### Custom codecs

Pass a spec anywhere a base name is accepted.

```typescript
import { createCodec, encode } from 'bufferbase';

encode(Uint8Array.of(5), { alphabet: '01', algorithm: 'radix' }); // '101'

const lowerHex = createCodec({ alphabet: '0123456789abcdef', algorithm: 'block', pad: false });
lowerHex.encode(Uint8Array.of(0, 1)); // '0001'

createCodec('01'); // a bare string means a radix codec over that alphabet
```

### Crockford's Base32

Crockford's specification describes a notation for numbers rather than for byte
streams, so a radix conversion is the right reading of it. Decoding accepts
either case, reads `I` and `L` as `1` and `O` as `0`, and ignores the hyphens
that may be inserted for readability. Encoding emits only the alphabet.

```typescript
decode('91jprv3f', 'base32crockford');   // Buffer('Hello')
decode('91JP-RV3F', 'base32crockford');  // the same
decode('9IJPRV3F', 'base32crockford');   // the same, reading I as 1
```

`base32crockfordcheck` appends the check symbol, the value modulo 37 written
with the alphabet extended by `*~$=U`. Decoding verifies it, so a mistyped
character is caught rather than decoded into different bytes.

```typescript
encode(Buffer.from('Hello'), 'base32crockfordcheck'); // '91JPRV3FG'
validate('91JPRV3XG', 'base32crockfordcheck');        // false
```

### Ascii85 variants

Several incompatible encodings share the Ascii85 algorithm and alphabet,
differing only in the shortcuts and framing they add. They are options rather
than separate codecs. The `ascii85` default is `zeroShortcut` alone, which
matches Python's `base64.a85encode`.

```typescript
import { createCodec, Chars } from 'bufferbase';

const btoa = createCodec({
  alphabet: Chars.Ascii85, algorithm: 'block85',
  zeroShortcut: true, spaceShortcut: true,      // '    ' -> 'y'
});

const adobe = createCodec({
  alphabet: Chars.Ascii85, algorithm: 'block85',
  zeroShortcut: true, delimiters: true,          // '<~ ... ~>'
});
```

## Canonical encodings

A trailing partial block leaves spare bits in the final character. RFC 4648
§3.5 requires them to be zero; input that sets them decodes to the same bytes
as the canonical form, so accepting it makes decoding non-injective.

```typescript
decode('Zm8=', 'base64'); // Buffer('fo')
decode('Zm9=', 'base64'); // throws NonCanonicalError — also 'fo'
```

This is rejected by default. Pass `strict: false` to read data from a lenient
encoder.

```typescript
createCodec({ alphabet: Chars.Base64, algorithm: 'block', strict: false });
```

The same check rejects lengths that cannot be a whole number of bytes
(`'Zm9vd'`), misplaced or excess padding, and Ascii85 groups above 2^32.

## API

```typescript
encode(buffer, base)              // string
decode(encoded, base, options?)   // Buffer
convert(input, from, to)          // string
validate(input, base)             // boolean
createCodec(spec | alphabet)      // ICodec
```

`base` is a name from the table above or a `CodecSpec`. Every spec accepts
`strict`, `caseInsensitive`, `aliases` and `ignore`:

```typescript
type CodecSpec =
  | { alphabet: string; algorithm: 'radix'; checkSymbols?: string }
  | { alphabet: string; algorithm: 'block'; pad?: string | false }
  | { alphabet: string; algorithm: 'block85';
      zeroShortcut?: boolean; spaceShortcut?: boolean;
      delimiters?: boolean; requireFullBlocks?: boolean };
```

### Also exported

| Export | What it is |
|---|---|
| `Bases` | The table above, as codec specs |
| `Chars` | The alphabets, for building your own specs |
| `isBaseName(value)` | Whether a string names one of `Bases` |
| `resolveSpec(base)` | The spec behind a name |
| `getCodec(spec)` | The codec for a spec, built once per spec object |
| `RadixCodec`, `BlockCodec`, `Block85Codec` | The implementations, if you want one directly |

### Errors

| Error | Thrown when |
|---|---|
| `InvalidCharacterError` | a character is not in the alphabet |
| `InvalidLengthError` | the length cannot encode a whole number of bytes |
| `NonCanonicalError` | spare bits are set and the codec is strict |
| `ValueRangeError` | a block85 group is 2^32 or above |
| `CheckSymbolError` | a check symbol does not match the value it follows |
| `BufferSizeError` | the result does not have the requested `size` |
| `UnknownBaseError` | the base name is not known |
| `InvalidCodecError` | the spec cannot be realised |

## License

ISC
