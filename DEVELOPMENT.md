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
git push origin main                        # everything to be released must be pushed
NPM_TOKEN=npm_xxx npx semantic-release --dry-run --no-ci   # check the version and the notes
NPM_TOKEN=npm_xxx bun run release
```

`bun run release` does, in order:

1. computes the version from the commits since the last tag
2. writes `CHANGELOG.md`
3. sets `version` in `package.json` and runs `npm publish`
   (`prepublishOnly` builds `dist/` first)
4. commits `CHANGELOG.md`, `package.json` and `bun.lock` back to `main`, and
   pushes the new tag over SSH
5. creates the GitHub release, using `GH_TOKEN` or `GITHUB_TOKEN`

Never edit `version` in `package.json` by hand. semantic-release computes it
and overwrites whatever is there.

### The token

The account requires two-factor authentication for writes, and semantic-release
cannot answer a prompt, so publishing needs a token that is allowed past it.
Create one at https://www.npmjs.com/settings/misebox/tokens:

- type: **Granular Access Token**
- Packages and scopes: **Read and write**, limited to `bufferbase`
- **Bypass two-factor authentication: enabled**
- expiration: as short as you are willing to renew

Nothing else will do. A classic publish token still gets asked for a one-time
password, and `NPM_CONFIG_OTP` is not accepted for this account.

`npm login` writes its own token to `~/.npmrc`, and npm would prefer it over
`NPM_TOKEN`. `scripts/release.sh` therefore writes a project-local `.npmrc`,
which outranks it, and deletes it when the release ends. That file is in
`.gitignore`; do not commit it.

### Why the dry run matters

semantic-release finds the previous release by walking git tags, not by asking
npm. If the tag for the last published version is missing from the remote, it
decides the next version is `1.0.0` and publishes that over a newer `latest`.
The dry run prints the version it settled on, which is what makes the mistake
visible before it ships.

```bash
git ls-remote --tags origin
```

### If a release fails partway

A failure after step 3 leaves the version on npm but no tag and no GitHub
release. Do not re-run `release`; it would try to publish the same version
again. Tag the released commit by hand, push it, and carry on from the next
change.

```bash
git tag v3.0.0 <commit> && git push origin v3.0.0
```
