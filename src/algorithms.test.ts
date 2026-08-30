import { Buffer } from 'node:buffer';
import { describe, test, expect } from 'bun:test';

import {
  Chars,
  Codecs,
  convert,
  createCodec,
  decode,
  encode,
  validate,
  BufferSizeError,
  CheckSymbolError,
  InvalidCodecError,
  InvalidLengthError,
  NonCanonicalError,
  ValueRangeError,
  type Base,
  type CodecSpec,
} from './index.js';

/** The test vectors published in RFC 4648 §10. */
const RFC_INPUTS = ['', 'f', 'fo', 'foo', 'foob', 'fooba', 'foobar'];
const RFC_VECTORS = {
  base16: ['', '66', '666F', '666F6F', '666F6F62', '666F6F6261', '666F6F626172'],
  base32: ['', 'MY======', 'MZXQ====', 'MZXW6===', 'MZXW6YQ=', 'MZXW6YTB', 'MZXW6YTBOI======'],
  base32hex: ['', 'CO======', 'CPNG====', 'CPNMU===', 'CPNMUOG=', 'CPNMUOJ1', 'CPNMUOJ1E8======'],
  base64: ['', 'Zg==', 'Zm8=', 'Zm9v', 'Zm9vYg==', 'Zm9vYmE=', 'Zm9vYmFy'],
} as const;

describe('RFC 4648', () => {
  for (const [base, expected] of Object.entries(RFC_VECTORS)) {
    test(`${base} matches the published vectors`, () => {
      expect(RFC_INPUTS.map((s) => encode(Buffer.from(s), base as Base))).toEqual([...expected]);
    });

    test(`${base} decodes the published vectors`, () => {
      expect(expected.map((s) => decode(s, base as Base).toString())).toEqual(RFC_INPUTS);
    });
  }

  test('base64url is unpadded, as JWT expects', () => {
    expect(encode(Buffer.from([0xfb, 0xff]), 'base64url')).toBe('-_8');
    expect(decode('-_8', 'base64url')).toEqual(Buffer.from([0xfb, 0xff]));
  });

  test('hex agrees with Node for every leading byte', () => {
    for (let first = 0; first < 256; first++) {
      const buffer = Buffer.from([first, 0x00, 0x9f]);
      expect(encode(buffer, 'hex')).toBe(buffer.toString('hex').toUpperCase());
    }
  });

  test('base64 agrees with Node for every input length', () => {
    for (let length = 0; length < 24; length++) {
      const buffer = Buffer.from(Array.from({ length }, (_, i) => (i * 37) % 256));
      expect(encode(buffer, 'base64')).toBe(buffer.toString('base64'));
    }
  });

  test('the native fast path agrees with the generic one', () => {
    // A pad character outside the spec keeps these codecs off the
    // Buffer.toString path, so the two implementations can be compared.
    const cases = [
      { fast: 'base64' as const, generic: { alphabet: Chars.Base64, algorithm: 'block', pad: '.' } },
      { fast: 'hex' as const, generic: { alphabet: Chars.Base16, algorithm: 'block', pad: '.' } },
      {
        fast: 'base64url' as const,
        generic: { alphabet: Chars.Base64Url, algorithm: 'block', pad: '.' },
      },
    ];
    for (const { fast, generic } of cases) {
      const codec = createCodec(generic as CodecSpec);
      for (let length = 0; length < 24; length++) {
        const buffer = Buffer.from(Array.from({ length }, (_, i) => (i * 91) % 256));
        const viaGeneric = codec.encode(buffer).replaceAll('.', fast === 'base64' ? '=' : '');
        expect([fast, length, viaGeneric]).toEqual([fast, length, encode(buffer, fast)]);
      }
    }
  });
});

describe('canonical encodings', () => {
  test('spare bits that are not zero are rejected', () => {
    expect(() => decode('Zm9=', 'base64')).toThrow(NonCanonicalError);
    expect(() => decode('Zh==', 'base64')).toThrow(NonCanonicalError);
    expect(validate('Zm9=', 'base64')).toBe(false);
  });

  test('the canonical form of the same bytes is accepted', () => {
    expect(decode('Zm8=', 'base64').toString()).toBe('fo');
    expect(decode('Zg==', 'base64').toString()).toBe('f');
  });

  test('strict: false accepts them, at the cost of injectivity', () => {
    const lenient = createCodec({ alphabet: Chars.Base64, algorithm: 'block', strict: false });
    expect(lenient.decode('Zm9=').toString()).toBe('fo');
    expect(lenient.decode('Zm8=').toString()).toBe('fo');
  });

  test('lengths that cannot be whole bytes are rejected', () => {
    for (const bad of ['Z', 'Zm9vd', 'Zm9vYmFyZ']) {
      expect(validate(bad, 'base64')).toBe(false);
    }
    // RFC 4648 allows 2, 4, 5, 7 and 8 data characters in a base32 block.
    for (const count of [1, 3, 6]) {
      const input = 'A'.repeat(count).padEnd(8, '=');
      expect(validate(input, 'base32')).toBe(false);
    }
    for (const count of [2, 4, 5, 7, 8]) {
      const input = 'A'.repeat(count).padEnd(8, '=');
      expect(validate(input, 'base32')).toBe(true);
    }
  });

  test('padding must be present and only at the end', () => {
    expect(() => decode('Zm8', 'base64')).toThrow(InvalidLengthError);
    expect(validate('=Zm8', 'base64')).toBe(false);
    expect(validate('Zm=8', 'base64')).toBe(false);
    expect(validate('Zg======', 'base64')).toBe(false);
  });

  test('an Ascii85 group above 2^32 encodes nothing', () => {
    // 's8W-!' is exactly 2^32 - 1, the largest group that does encode 4 bytes.
    expect(decode('s8W-!', 'ascii85')).toEqual(Buffer.from('ffffffff', 'hex'));
    expect(() => decode('s8W-"', 'ascii85')).toThrow(ValueRangeError);
  });

  test('a longer-than-needed Ascii85 tail is rejected', () => {
    const canonical = encode(Buffer.from('ab'), 'ascii85');
    expect(decode(canonical, 'ascii85').toString()).toBe('ab');
    expect(validate(canonical.slice(0, -1) + Chars.Ascii85[84], 'ascii85')).toBe(false);
  });
});

describe('validate agrees with decode', () => {
  const bases = ['base64', 'base64url', 'base32', 'base16', 'base58', 'ascii85', 'z85'] as const;
  const pieces = ['A', 'Z', 'm', '9', '=', '!', 'z', 'y', '~', '1', '0', 'u', '/', '-'];

  for (const base of bases) {
    test(base, () => {
      let checked = 0;
      for (let seed = 0; seed < 400; seed++) {
        let input = '';
        for (let n = seed % 9; n > 0; n--) {
          input += pieces[(seed * 7 + n * 13) % pieces.length];
        }
        let decodes = true;
        try {
          decode(input, base);
        } catch {
          decodes = false;
        }
        expect([input, validate(input, base)]).toEqual([input, decodes]);
        checked++;
      }
      expect(checked).toBe(400);
    });
  }
});

describe('Ascii85 and Z85', () => {
  test('the default matches Python a85encode', () => {
    expect(encode(Buffer.from('Man '), 'ascii85')).toBe('9jqo^');
    expect(encode(Buffer.alloc(4), 'ascii85')).toBe('z');
    expect(encode(Buffer.from('    '), 'ascii85')).toBe('+<VdL');
  });

  test('shortcuts and framing are independent options', () => {
    const btoa = createCodec({
      alphabet: Chars.Ascii85,
      algorithm: 'block85',
      zeroShortcut: true,
      spaceShortcut: true,
    });
    const adobe = createCodec({
      alphabet: Chars.Ascii85,
      algorithm: 'block85',
      zeroShortcut: true,
      delimiters: true,
    });
    const plain = createCodec({ alphabet: Chars.Ascii85, algorithm: 'block85' });

    expect(btoa.encode(Buffer.from('    '))).toBe('y');
    expect(adobe.encode(Buffer.from('    '))).toBe('<~+<VdL~>');
    expect(adobe.encode(Buffer.alloc(4))).toBe('<~z~>');
    expect(plain.encode(Buffer.alloc(4))).toBe('!!!!!');

    for (const codec of [btoa, adobe, plain]) {
      const bytes = Buffer.from('  \0\0\0\0ab');
      expect(codec.decode(codec.encode(bytes))).toEqual(bytes);
    }
  });

  test('framing is required when configured', () => {
    const adobe = createCodec({
      alphabet: Chars.Ascii85,
      algorithm: 'block85',
      delimiters: true,
    });
    expect(adobe.validate('9jqo^')).toBe(false);
    expect(adobe.validate('<~9jqo^~>')).toBe(true);
  });

  test('a shortcut may not appear inside a group', () => {
    expect(validate('9jz', 'ascii85')).toBe(false);
  });

  test('z85 matches the ZeroMQ RFC 32 vector', () => {
    const bytes = Buffer.from('864FD26FB559F75B', 'hex');
    expect(encode(bytes, 'z85')).toBe('HelloWorld');
    expect(decode('HelloWorld', 'z85')).toEqual(bytes);
  });

  test('z85 encodes whole blocks only', () => {
    expect(() => encode(Buffer.from('abc'), 'z85')).toThrow(InvalidLengthError);
    expect(() => decode('abcdef', 'z85')).toThrow(InvalidLengthError);
  });

  test('a trailing group needs at least two characters', () => {
    const encoded = encode(Buffer.from('Man x'), 'ascii85');
    expect(encoded).toBe('9jqo^GQ'); // 5 characters for the block, 2 for the byte
    expect(validate(encoded, 'ascii85')).toBe(true);
    expect(validate(encoded.slice(0, 6), 'ascii85')).toBe(false);
  });
});

describe("Crockford's Base32", () => {
  test('reads the symbols a reader is likely to confuse', () => {
    const encoded = encode(Buffer.from('Hello'), 'base32crockford');
    expect(encoded).toBe('91JPRV3F');
    for (const written of [encoded.toLowerCase(), encoded.replaceAll('1', 'I'), encoded.replaceAll('1', 'l')]) {
      expect([written, decode(written, 'base32crockford').toString()]).toEqual([written, 'Hello']);
    }
    const zeros = encode(Buffer.from([0, 0, 5]), 'base32crockford');
    expect(decode(zeros.replaceAll('0', 'O'), 'base32crockford')).toEqual(Buffer.from([0, 0, 5]));
  });

  test('ignores hyphens inserted for readability', () => {
    const encoded = encode(Buffer.from('Hello'), 'base32crockford');
    expect(decode(`${encoded.slice(0, 3)}-${encoded.slice(3)}`, 'base32crockford').toString()).toBe(
      'Hello',
    );
    expect(validate('-91-JP-RV-3F-', 'base32crockford')).toBe(true);
  });

  test('encoding emits only the alphabet', () => {
    for (let n = 0; n < 200; n++) {
      const encoded = encode(Buffer.from([n, (n * 7) % 256]), 'base32crockford');
      expect([n, /^[0-9A-HJKMNP-TV-Z]*$/.test(encoded)]).toEqual([n, true]);
    }
  });

  test('the check symbol catches a changed character', () => {
    const encoded = encode(Buffer.from('Hello'), 'base32crockfordcheck');
    expect(encoded).toBe('91JPRV3FG');
    expect(decode(encoded, 'base32crockfordcheck').toString()).toBe('Hello');

    for (let at = 0; at < encoded.length - 1; at++) {
      const other = encoded[at] === '1' ? '2' : '1';
      const changed = encoded.slice(0, at) + other + encoded.slice(at + 1);
      expect([at, validate(changed, 'base32crockfordcheck')]).toEqual([at, false]);
    }
    expect(validate(`${encoded.slice(0, -1)}9`, 'base32crockfordcheck')).toBe(false);
    expect(() => decode(`${encoded.slice(0, -1)}9`, 'base32crockfordcheck')).toThrow(
      CheckSymbolError,
    );
  });

  test('the check symbol is read in either case, like the rest', () => {
    const encoded = encode(Buffer.from('Hello, World!'), 'base32crockfordcheck');
    expect(decode(encoded.toLowerCase(), 'base32crockfordcheck').toString()).toBe('Hello, World!');
    const withU = encode(Buffer.from([0x00, 0x24]), 'base32crockfordcheck');
    expect(withU.slice(-1)).toBe('U');
    expect(decode(withU.toLowerCase(), 'base32crockfordcheck')).toEqual(Buffer.from([0x00, 0x24]));
  });

  test('the check symbol uses the five extra symbols for 32 to 36', () => {
    for (const [value, expected] of [
      [0x20, '*'],
      [0x21, '~'],
      [0x22, '$'],
      [0x23, '='],
      [0x24, 'U'],
    ] as const) {
      const bytes = Buffer.from([0x00, value]);
      const encoded = encode(bytes, 'base32crockfordcheck');
      expect([value, encoded.slice(-1)]).toEqual([value, expected]);
      expect([value, decode(encoded, 'base32crockfordcheck')]).toEqual([value, bytes]);
    }
  });

  test('a checked encoding always carries its symbol', () => {
    expect(validate('', 'base32crockfordcheck')).toBe(false);
    expect(encode(Buffer.alloc(0), 'base32crockfordcheck')).toBe('0');
    expect(decode('0', 'base32crockfordcheck')).toEqual(Buffer.alloc(0));
  });

  test('every checked string validates exactly when it decodes', () => {
    const pieces = ['0', '1', 'I', 'O', 'l', '-', 'Z', '*', 'U', '9', 'G'];
    for (let seed = 0; seed < 500; seed++) {
      let input = '';
      for (let n = seed % 7; n > 0; n--) {
        input += pieces[(seed * 5 + n * 3) % pieces.length];
      }
      let decodes = true;
      try {
        decode(input, 'base32crockfordcheck');
      } catch {
        decodes = false;
      }
      expect([input, validate(input, 'base32crockfordcheck')]).toEqual([input, decodes]);
    }
  });
});

describe('aliases and ignored characters', () => {
  test('an alias must point at a character of the alphabet', () => {
    expect(() =>
      createCodec({ alphabet: '01', algorithm: 'radix', aliases: { O: '9' } }),
    ).toThrow(InvalidCodecError);
  });

  test('an alias may not already be in the alphabet', () => {
    expect(() =>
      createCodec({ alphabet: '012', algorithm: 'radix', aliases: { 2: '0' } }),
    ).toThrow(InvalidCodecError);
  });

  test('an ignored character may not also be decodable', () => {
    expect(() => createCodec({ alphabet: '01', algorithm: 'radix', ignore: '1' })).toThrow(
      InvalidCodecError,
    );
  });

  test('check symbols may not repeat the alphabet', () => {
    expect(() =>
      createCodec({ alphabet: '0123456789', algorithm: 'radix', checkSymbols: '9*' }),
    ).toThrow(InvalidCodecError);
  });
});

describe('size option', () => {
  test('a radix codec pads to the requested length', () => {
    const encoded = encode(Buffer.from([0x01, 0x02]), 'base58');
    expect(decode(encoded, 'base58', { size: 8 })).toEqual(
      Buffer.from([0, 0, 0, 0, 0, 0, 0x01, 0x02]),
    );
  });

  test('a radix codec rejects a result that is too long', () => {
    const encoded = encode(Buffer.from('a longer payload'), 'base58');
    expect(() => decode(encoded, 'base58', { size: 4 })).toThrow(BufferSizeError);
  });

  test('a block codec checks the length it derives', () => {
    expect(decode('Zm9v', 'base64', { size: 3 })).toEqual(Buffer.from('foo'));
    expect(() => decode('Zm9v', 'base64', { size: 4 })).toThrow(BufferSizeError);
    expect(() => decode('HelloWorld', 'z85', { size: 5 })).toThrow(BufferSizeError);
  });
});

describe('case insensitivity', () => {
  test('base32 and hex accept either case', () => {
    expect(decode('mzxw6ytb', 'base32').toString()).toBe('fooba');
    expect(decode('666f6f', 'hex').toString()).toBe('foo');
    expect(validate('mzxw6ytb', 'base32')).toBe(true);
  });

  test('base64 stays case sensitive, because its alphabet uses both', () => {
    expect(decode('Zm9v', 'base64').toString()).toBe('foo');
    expect(decode('ZM9V', 'base64').toString()).not.toBe('foo');
  });
});

describe('migrating data written by bufferbase 2', () => {
  test('radix64 reads it and base64 rewrites it', () => {
    const bytes = Buffer.from('Hello, world!');
    const legacy = encode(bytes, 'radix64');
    expect(legacy).toBe('BIZWxsbywgd29ybGQh');
    expect(convert(legacy, 'radix64', 'base64')).toBe(bytes.toString('base64'));
  });

  test('the radix aliases keep the old algorithm', () => {
    for (const [modern, legacy] of [
      ['base16', 'radix16'],
      ['base32', 'radix32'],
      ['base64', 'radix64'],
      ['base64url', 'radix64url'],
    ] as const) {
      const bytes = Buffer.from([0x00, 0x0f, 0x2a]);
      expect(encode(bytes, legacy)).not.toBe(encode(bytes, modern));
      expect(decode(encode(bytes, legacy), legacy)).toEqual(bytes);
    }
  });
});

describe('codec specs that cannot work', () => {
  test('block needs a power-of-two alphabet', () => {
    expect(() => createCodec({ alphabet: Chars.Base58, algorithm: 'block' })).toThrow(
      InvalidCodecError,
    );
  });

  test('block85 needs exactly 85 characters', () => {
    expect(() => createCodec({ alphabet: Chars.Base64, algorithm: 'block85' })).toThrow(
      InvalidCodecError,
    );
  });

  test('an alphabet may not repeat a character', () => {
    expect(() => createCodec('0101')).toThrow(InvalidCodecError);
  });

  test('case folding needs an alphabet of one case', () => {
    expect(() =>
      createCodec({ alphabet: Chars.Base64, algorithm: 'block', caseInsensitive: true }),
    ).toThrow(InvalidCodecError);
  });

  test('the pad character may not be part of the alphabet', () => {
    expect(() =>
      createCodec({ alphabet: Chars.Base16, algorithm: 'block', pad: 'A' }),
    ).toThrow(InvalidCodecError);
  });

  test('a shortcut character may not be part of the alphabet', () => {
    expect(() =>
      createCodec({ alphabet: Chars.Z85, algorithm: 'block85', zeroShortcut: true }),
    ).toThrow(InvalidCodecError);
  });
});

describe('every named base round-trips', () => {
  test('through Codecs, for a payload each one accepts', () => {
    const bytes = Buffer.from('Hello, World');
    for (const [name, codec] of Object.entries(Codecs)) {
      expect([name, codec.decode(codec.encode(bytes))]).toEqual([name, bytes]);
      expect([name, codec.validate(codec.encode(bytes))]).toEqual([name, true]);
    }
  });
});
