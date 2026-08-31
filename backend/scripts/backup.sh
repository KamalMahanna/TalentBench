#!/usr/bin/env bash
# ==============================================================================
# TalentBench Production PostgreSQL Backup Script
# RPO Target: 1 Hour (Combined with continuous WAL archiving)
# RTO Target: 30 Minutes
# ==============================================================================
set -euo pipefail

POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_DB="${POSTGRES_DB:-talentbench}"

BACKUP_DIR="${BACKUP_DIR:-/tmp/talentbench_backups}"
TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_FILE="${BACKUP_DIR}/talentbench_${TIMESTAMP}.dump.gz"
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-talentbench-backups}"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u)] Starting automated backup for database: ${POSTGRES_DB}..."

export PGPASSWORD="${POSTGRES_PASSWORD}"

# Perform compressed pg_dump in custom directory format
pg_dump \
  -h "${POSTGRES_HOST}" \
  -p "${POSTGRES_PORT}" \
  -U "${POSTGRES_USER}" \
  -Fc \
  --verbose \
  "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -u)] Backup created successfully: ${BACKUP_FILE} (Size: ${FILE_SIZE})"

# Generate SHA256 checksum
sha256sum "${BACKUP_FILE}" > "${BACKUP_FILE}.sha256"

echo "[$(date -u)] Backup checksum generated."

# Optional upload to S3 / MinIO
if command -v aws >/dev/null 2>&1; then
  echo "[$(date -u)] Uploading backup to s3://${S3_BACKUP_BUCKET}/..."
  aws s3 cp "${BACKUP_FILE}" "s3://${S3_BACKUP_BUCKET}/daily/talentbench_${TIMESTAMP}.dump.gz"
  aws s3 cp "${BACKUP_FILE}.sha256" "s3://${S3_BACKUP_BUCKET}/daily/talentbench_${TIMESTAMP}.dump.gz.sha256"
  echo "[$(date -u)] S3 backup upload complete."
fi

echo "[$(date -u)] Backup completed successfully."

