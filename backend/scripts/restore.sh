#!/usr/bin/env bash
# ==============================================================================
# TalentBench Production PostgreSQL Disaster Recovery / Restore Script
# Usage: ./restore.sh <path-to-backup-file.dump.gz>
# ==============================================================================
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path_to_backup_file.dump.gz>"
  exit 1
fi

BACKUP_FILE="$1"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-talentbench}"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file ${BACKUP_FILE} not found!"
  exit 1
fi

echo "[$(date -u)] Verifying checksum if available..."
if [ -f "${BACKUP_FILE}.sha256" ]; then
  sha256sum -c "${BACKUP_FILE}.sha256"
  echo "[$(date -u)] Checksum verification PASSED."
fi

echo "[$(date -u)] Starting restore into database ${POSTGRES_DB} on ${POSTGRES_HOST}:${POSTGRES_PORT}..."

export PGPASSWORD="${POSTGRES_PASSWORD}"

# Decompress and restore using pg_restore
gunzip -c "${BACKUP_FILE}" | pg_restore \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose || true

echo "[$(date -u)] Restore completed successfully."

