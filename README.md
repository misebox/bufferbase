# bufferbase

Buffer-to-BaseN encoding and decoding for Node.js.

## Installation

```bash
npm install bufferbase
```

## Usage

### Simple Function API

```typescript
import { encode, decode, convert, validate } from 'bufferbase';

// Encode buffer to base58
const encoded = encode(Buffer.from('Hello'), 'base58');

// Decode base58 string to buffer
const decoded = decode(encoded, 'base58');

// Decode with fixed size (pads with leading zeros)
const fixed = decode(encoded, 'base58', { size: 32 });

// Convert between bases
const base64 = convert(encoded, 'base58', 'base64url');

// Validate string
validate('9Ajdvz', 'base58'); // true
validate('0Ajdvz', 'base58'); // false ('0' not in base58)
```

### Pre-defined Codecs

```typescript
import { Codecs } from 'bufferbase';

const encoded = Codecs.base58.encode(Buffer.from('Hello'));
const decoded = Codecs.base58.decode(encoded);

// Convert between codecs
const base64 = Codecs.base58.convertTo(Codecs.base64url, encoded);

// Validate
Codecs.base58.validate('9Ajdvz'); // true
```

### Custom Character Set

```typescript
import { createCodec } from 'bufferbase';

const binary = createCodec('01');
binary.encode(Buffer.from([5])); // '101'
binary.decode('101'); // Buffer([5])
```

## Supported Encodings

| Name | Characters |
|------|------------|
| `decimal` | 0-9 |
| `base16` / `hex` | 0-9A-F |
| `base32` | A-Z2-7 |
| `base32crockford` | 0-9A-HJKMNP-TV-Z |
| `base36` | 0-9A-Z |
| `base52` | A-Za-z |
| `base58` | Bitcoin alphabet (no 0OIl) |
| `base64` | A-Za-z0-9+/ |
| `base64url` | A-Za-z0-9-_ |
| `base64xml` | A-Za-z0-9._ |
| `base64xmlname` | A-Za-z0-9_: |
| `ascii85` | ASCII85 |
| `base85` | Base85 |
| `z85` | ZeroMQ Z85 |

## API

### Functions

- `encode(buffer, base)` - Encode buffer to string
- `decode(encoded, base, options?)` - Decode string to buffer
- `convert(input, from, to)` - Convert between bases
- `validate(input, base)` - Check if string is valid for base
- `createCodec(chars)` - Create codec with custom character set

### Codecs Object

```typescript
Codecs.base58.encode(buffer)
Codecs.base58.decode(encoded, options?)
Codecs.base58.validate(input)
Codecs.base58.convertTo(targetCodec, input)
```

### Options

```typescript
interface DecodeOptions {
  size?: number; // Expected buffer size (pads with zeros if smaller)
}
```

### Errors

- `InvalidCharacterError` - Invalid character in decode input
- `BufferSizeError` - Decoded buffer exceeds specified size
- `UnknownBaseError` - Unknown base name

## License

ISC
