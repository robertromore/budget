#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_URL="${DATABASE_URL:-file:./drizzle/db/sqlite.db}"

if [[ "$DB_URL" != file:* ]]; then
  echo "Skipping migration baseline for non-file DATABASE_URL: $DB_URL"
  exit 0
fi

DB_PATH="${DB_URL#file:}"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Skipping migration baseline because database file was not found: $DB_PATH"
  exit 0
fi

sqlite3 "$DB_PATH" \
  "CREATE TABLE IF NOT EXISTS __drizzle_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, hash TEXT NOT NULL, created_at numeric);"

APPLIED_COUNT="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM __drizzle_migrations;")"
if [[ "$APPLIED_COUNT" != "0" ]]; then
  echo "Migration baseline not needed; __drizzle_migrations already has $APPLIED_COUNT row(s)."
  exit 0
fi

USER_TABLE_COUNT="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations';")"
if [[ "$USER_TABLE_COUNT" == "0" ]]; then
  echo "Migration baseline not needed; database has no user tables."
  exit 0
fi

JOURNAL_PATH="./drizzle/meta/_journal.json"
if [[ ! -f "$JOURNAL_PATH" ]]; then
  echo "Cannot baseline migrations; missing journal at $JOURNAL_PATH"
  exit 1
fi

echo "Baselining drizzle migrations for existing database at $DB_PATH..."

while IFS=$'\t' read -r tag when; do
  if [[ -z "$tag" || -z "$when" ]]; then
    continue
  fi

  SQL_PATH="./drizzle/${tag}.sql"
  if [[ ! -f "$SQL_PATH" ]]; then
    echo "Cannot baseline migrations; missing migration file $SQL_PATH"
    exit 1
  fi

  HASH="$(shasum -a 256 "$SQL_PATH" | awk '{print $1}')"
  sqlite3 "$DB_PATH" "INSERT INTO __drizzle_migrations (hash, created_at) VALUES ('$HASH', $when);"
done < <(jq -r '.entries[] | [.tag, .when] | @tsv' "$JOURNAL_PATH")

BASELINED_COUNT="$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM __drizzle_migrations;")"
echo "Migration baseline complete; recorded $BASELINED_COUNT migration(s)."
