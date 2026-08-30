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
| `bun run example` | Runs `src/example.ts` against the source |
| `bun run check:npm-auth` | Fails unless npm has a session |
| `bun run release` | Publishes, via semantic-release |

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

## Commit messages decide the version

semantic-release reads the commits since the last tag:

| Commit | Release |
|---|---|
| `fix: ...` | patch |
| `feat: ...` | minor |
| any type with a `BREAKING CHANGE:` footer | major |
| `chore: ...`, `docs: ...`, `test: ...` | none |

Put the migration instruction in the `BREAKING CHANGE` footer. It becomes the
CHANGELOG entry and the GitHub release note, which is where a person looks when
an upgrade breaks them.

Do not add attribution trailers to commit messages.

## Releasing

```bash
git push origin main                     # everything to be released must be pushed
npx semantic-release --dry-run --no-ci   # check the version and the notes
bun run release                          # prepares the release
npm publish                              # publishes it, authenticating in the browser
```

`bun run release` does, in order:

1. computes the version from the commits since the last tag
2. writes `CHANGELOG.md`
3. sets `version` in `package.json`
4. commits `CHANGELOG.md`, `package.json` and `bun.lock` back to `main`, and
   pushes the new tag over SSH
5. creates the GitHub release, using `GH_TOKEN` or `GITHUB_TOKEN`

`npm publish` then builds `dist/` through `prepublishOnly` and uploads it.

Never edit `version` in `package.json` by hand. semantic-release computes it
and overwrites whatever is there.

### Why publishing is a separate step

The npm account requires two-factor authentication for writes, which npm
satisfies by opening a browser. semantic-release runs npm as a
non-interactive subprocess and cannot answer that prompt, so
`@semantic-release/npm` is configured with `npmPublish: false` and publishing
stays a command you run yourself.

The alternative is a granular access token with "Bypass two-factor
authentication" enabled, exported as `NPM_TOKEN`, which is what a CI job would
need. It is a long-lived credential that can publish on its own, so it is not
worth keeping on a laptop for a release you are present for anyway.

### Why the dry run matters

semantic-release finds the previous release by walking git tags, not by asking
npm. If the tag for the last published version is missing from the remote, it
decides the next version is `1.0.0` and publishes that over a newer `latest`.
The dry run prints the version it settled on, which is what makes the mistake
visible before it ships.

```bash
git ls-remote --tags origin
```

### If publishing fails

The tag and the GitHub release already exist at that point, but npm does not
have the version. Do not re-run `release`; it would compute a further version
on top of a release that never shipped. Fix whatever npm objected to and run
`npm publish` again.
