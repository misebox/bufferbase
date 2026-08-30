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

semantic-release owns the version number. Never edit `version` in
`package.json` by hand — the next release is computed from the commits, and a
hand-edited version is simply overwritten.

### Preflight

```bash
git status                          # clean, and on main
git ls-remote --tags origin         # the previous release must be tagged here
npm whoami                          # or: npm login
echo "${GH_TOKEN:-$GITHUB_TOKEN}"   # must be non-empty
bun test
```

The tag check matters: semantic-release finds the previous release by walking
git tags, not by reading npm. If the tag for the last published version is
missing from the remote, it will decide the next version is `1.0.0` and
publish that over a newer `latest`.

### Dry run

Prints the version and the release notes. Publishes nothing, tags nothing,
pushes nothing.

```bash
npx semantic-release --dry-run --no-ci
```

### Publish

The npm account has two-factor authentication set to `auth-and-writes`, so
publishing needs a one-time password. semantic-release cannot prompt for one,
so pass it in the environment. The code is short-lived — read it immediately
before running the command.

```bash
NPM_CONFIG_OTP=123456 bun run release
```

That runs, in order:

1. computes the version from the commits
2. writes `CHANGELOG.md`
3. sets `version` in `package.json` and runs `npm publish`
   (`prepublishOnly` builds `dist/` first)
4. commits `CHANGELOG.md`, `package.json` and `bun.lock` back to `main`, and
   pushes the new tag
5. creates the GitHub release

Step 4 pushes over SSH using the `origin` remote, and step 5 uses `GH_TOKEN` or
`GITHUB_TOKEN`.

If you would rather not deal with the one-time password on every release,
either relax the account setting:

```bash
npm profile set fa-mode auth-only   # 2FA for login, not for publishing
```

or issue a granular automation token on npmjs.com and set `NPM_TOKEN` for the
release only. Automation tokens bypass 2FA, which is why they are the usual
choice for CI — and why an unattended one is worth scoping and rotating.

### If a release fails partway

A failure after step 3 leaves the version published on npm but the tag and the
GitHub release missing. Do not re-run `release`: it would try to publish the
same version again. Tag the released commit by hand and push it, then continue
from the next change.

```bash
git tag v3.0.0 <commit> && git push origin v3.0.0
```
