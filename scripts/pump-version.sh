#!/usr/bin/env bash

set -euo pipefail

version=$1

echo "update version field"
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' -E 's/"version": ".+"/"version": "'"$version"'"/' package.json
else
  # Linux (including Ubuntu)
  sed -i -E 's/"version": ".+"/"version": "'"$version"'"/' package.json
fi

echo "publish"
bun run build
npm publish

echo "commit new version"
git add package.json
git commit -m "publish version $version"

echo "tag version"
git tag "$version"

echo "push to remote"
git push origin dev # TODO(TONY): change to main
git push origin "$version"
