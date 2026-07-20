#!/usr/bin/env bash
set -euo pipefail

mode="${1:-}"
version="${2:-}"
artifact_sha256="${3:-}"
deploy_root="${4:-}"
run_key="${5:-}"

fail() {
  echo "deploy-release: $*" >&2
  exit 1
}

[[ "$version" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || fail "invalid version"
[[ "$artifact_sha256" =~ ^[0-9a-f]{64}$ ]] || fail "invalid SHA-256"
[[ "$deploy_root" =~ ^/var/www/[A-Za-z0-9._/-]+$ ]] || fail "unsafe deploy root"
[[ "$run_key" =~ ^[0-9]+-[0-9]+$ ]] || fail "invalid run key"

releases_root="$deploy_root/releases"
staging_root="$deploy_root/.staging"
release_path="$releases_root/$version"
staging_path="$staging_root/$version-$run_key"

verify_release() {
  local path="$1"
  [[ -f "$path/index.html" ]] || fail "release has no index.html"
  grep -Fq "<meta name=\"pbdh-version\" content=\"$version\">" "$path/index.html" || fail "release version marker mismatch"
  [[ -f "$path/.release-sha256" ]] || fail "release has no checksum marker"
  [[ "$(cat "$path/.release-sha256")" == "$artifact_sha256" ]] || fail "immutable release checksum mismatch"
}

activate_release() {
  local next_link="$deploy_root/.current-$run_key"
  ln -sfn "releases/$version" "$next_link"
  mv -Tf "$next_link" "$deploy_root/current"
}

case "$mode" in
  prepare)
    mkdir -p "$releases_root" "$staging_root"
    if [[ -d "$release_path" ]]; then
      verify_release "$release_path"
      echo "reuse"
      exit 0
    fi
    [[ ! -e "$staging_path" ]] || fail "staging path already exists; inspect it manually"
    mkdir "$staging_path"
    echo "upload"
    ;;
  activate)
    if [[ -d "$release_path" ]]; then
      verify_release "$release_path"
      activate_release
      echo "activated existing release $version"
      exit 0
    fi
    [[ -d "$staging_path" ]] || fail "staging path does not exist"
    [[ -f "$staging_path/index.html" ]] || fail "staged release has no index.html"
    grep -Fq "<meta name=\"pbdh-version\" content=\"$version\">" "$staging_path/index.html" || fail "staged version marker mismatch"
    printf '%s\n' "$artifact_sha256" > "$staging_path/.release-sha256"
    mv "$staging_path" "$release_path"
    verify_release "$release_path"
    activate_release
    echo "activated new release $version"
    ;;
  *)
    fail "mode must be prepare or activate"
    ;;
esac
