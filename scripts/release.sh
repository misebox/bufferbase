#!/bin/sh
# Prepares the release, then hands publishing back to you.
#
# semantic-release works out the version, writes the changelog, tags, pushes
# and creates the GitHub release. It does not publish: npm asks for two-factor
# authentication in a browser, and semantic-release runs npm as a
# non-interactive subprocess that cannot answer.
set -e

npx semantic-release "$@"

case " $* " in
  *" --dry-run "*) exit 0 ;;
esac

VERSION=$(node -p "require('./package.json').version")
cat <<MSG

Prepared $VERSION. To publish it, authenticating in the browser:

  npm publish

MSG
