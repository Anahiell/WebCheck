#!/bin/sh
set -eu
base=http://127.0.0.1:8080
curl --fail --silent "$base/" | grep -q 'topology-svg'
curl --fail --silent "$base/api/status" | python3 -c 'import json,sys; s=json.load(sys.stdin); assert s["schema"] == 1; assert s["robot"]["connected"] is False'
for path in /.git/config /deploy/ /README.md /missing /api/ /%2e%2e/etc/passwd; do
    code=$(curl --path-as-is -s -o /dev/null -w '%{http_code}' "$base$path")
    case "$code" in 400|403|404) ;; *) echo "Unexpected exposure: $path ($code)"; exit 1;; esac
done
for method in POST PUT DELETE PATCH; do
    [ "$(curl -s -o /dev/null -w '%{http_code}' -X "$method" "$base/api/status")" = 405 ]
done
curl -sI "$base/" | grep -qi 'Content-Security-Policy:'
echo 'HTTP security checks passed'
