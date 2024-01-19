import { Chars, BufferEncoder } from "./bufferbase.js";
import { Buffer } from "node:buffer";
import test from "node:test"; // ①
import assert from "node:assert";

test("anybase", async (t) => {
  await t.test(
    "encodes and decodes a string correctly with base58chars",
    () => {
      const encoder = new BufferEncoder(Chars.Base58);
      const buffer = Buffer.from("Hello, World!", "utf8");

      const encoded = encoder.encode(buffer);
      const decoded = encoder.decode(encoded);

      assert.strictEqual(decoded.toString("utf8"), "Hello, World!");
    }
  );

  await t.test("handles empty buffer correctly", () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.alloc(0);

    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded);

    assert.strictEqual(decoded.toString("utf8"), "");
  });

  await t.test("handles long buffer correctly", () => {
    const encoder = new BufferEncoder(Chars.Base58);
    const buffer = Buffer.from("Hello, World!".repeat(100), "utf8");

    const encoded = encoder.encode(buffer);
    const decoded = encoder.decode(encoded);

    assert.strictEqual(decoded.toString("utf8"), "Hello, World!".repeat(100));
  });

  await t.test("encode and decode various chars correctly", () => {
    const variousCharTables = Object.keys(Chars);
    for (const charTable of variousCharTables) {
      const encoder = new BufferEncoder(Chars[charTable]);
      const buffer = Buffer.from("Hello, World!", "utf8");

      const encoded = encoder.encode(buffer);
      const decoded = encoder.decode(encoded);

      assert.strictEqual(decoded.toString("utf8"), "Hello, World!");
    }
  });

  await t.test("throws error on invalid characters in decode", () => {
    assert.throws(() => {
      const encoder = new BufferEncoder(Chars.Base58);
      encoder.decode("InvalidString!");
    }, new Error("Invalid character found"));
  });
});
