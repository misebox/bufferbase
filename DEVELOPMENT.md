# Development

## Requirements

- [Bun](https://bun.sh) — runtime, package manager, and test runner
- Node.js — only for `npm publish` during a release

```bash
bun install
```

## Commands

| Command | What it does |
|---|---|
| `bun test` | Runs the test suite |
| `bun run build` | Emits `dist/esm` and `dist/cjs`, then fixes up the dual-package fields |
| `bun run release <level>` | Versions, publishes and pushes (see below) |
| `bun run example` | Runs `src/example.ts` against the source |
| `bun run check:npm-auth` | Fails unless npm has a session |

## Layout

| File | Contents |
|---|---|
| `types.ts` | `CodecSpec` and the interfaces |
| `bases.ts` | Alphabets (`Chars`) and the named encodings (`Bases`) |
| `codec-base.ts` | Alphabet handling shared by the three implementations |
| `codec-radix.ts` | `radix` — big-integer conversion, check symbols |
| `codec-block.ts` | `block` — RFC 4648 bit regrouping |
| `codec-block85.ts` | `block85` — 4 bytes to 5 characters |
| `codec.ts` | `createCodec` dispatch and the per-spec cache |
| `functions.ts` | `encode` / `decode` / `convert` / `validate` |

Adding an encoding usually means one entry in `Bases`, not new code. Reach for
a new algorithm only when the byte-to-character mapping itself is different.

## Commit messages

`fix:` / `feat:` / `chore:` prefixes, and a `BREAKING CHANGE:` footer when an
upgrade needs action. Put the migration instruction in that footer — it is what
someone reads when the upgrade breaks them.

Do not add attribution trailers to commit messages.

## Releasing

```bash
bun run release major        # or minor / patch / an explicit version
```

`bin/release` checks that you are on `main`, that the tree is clean and level
with `origin/main`, and that the tests pass, then asks before going ahead. It
bumps the version, publishes, and pushes only after npm has accepted the
package — so a failed publish leaves the version commit and its tag local, and
nothing public has changed.

`npm publish` opens a browser for two-factor authentication. There is no token
to keep anywhere.
