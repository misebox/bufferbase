#!/bin/sh
# Publishes with semantic-release.
#
# npm requires two-factor authentication for writes on this account, and
# semantic-release cannot answer a prompt. A granular access token with
# "Bypass two-factor authentication" is the supported way through.
#
# The token has to reach npm through an .npmrc that outranks the one npm login
# writes to the home directory, so this writes a project-local one for the
# duration of the release. It is listed in .gitignore and removed on exit.
set -e

if [ -z "$NPM_TOKEN" ]; then
  cat >&2 <<'MSG'
NPM_TOKEN is not set.

Create one at https://www.npmjs.com/settings/misebox/tokens
  - type: Granular Access Token
  - Packages and scopes: Read and write, limited to bufferbase
  - Bypass two-factor authentication: enabled
  - expiration: as short as you are willing to renew

Then run:
  NPM_TOKEN=npm_xxxxxxxx bun run release
MSG
  exit 1
fi

trap 'rm -f .npmrc' EXIT INT TERM
printf '//registry.npmjs.org/:_authToken=%s\n' "$NPM_TOKEN" > .npmrc
chmod 600 .npmrc

npx semantic-release "$@"
