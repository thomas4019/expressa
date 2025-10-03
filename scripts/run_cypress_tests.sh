set -e

rm -rf testdata

node test/testserver.js &
pid=$!

cleanup() {
  if kill -0 "$pid" >/dev/null 2>&1; then
    kill "$pid" || true
    # give it a moment to exit gracefully
    sleep 1 || true
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill -9 "$pid" || true
    fi
  fi
}
trap cleanup EXIT

# Wait for server readiness
attempts=0
until curl -sSf "http://localhost:3001/admin" >/dev/null 2>&1; do
  attempts=$((attempts+1))
  if [ "$attempts" -gt 120 ]; then
    echo "Server did not become ready on http://localhost:3001/admin" >&2
    exit 1
  fi
  # bail out early if server died
  if ! kill -0 "$pid" >/dev/null 2>&1; then
    echo "Server process exited prematurely" >&2
    exit 1
  fi
  sleep 0.5
done

./node_modules/.bin/cypress run