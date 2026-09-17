CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS permissions (
  code TEXT PRIMARY KEY NOT NULL,
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  category TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  granted_at TEXT NOT NULL,
  PRIMARY KEY (user_id, permission_code)
);

CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  db_filename TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_single_active
  ON academic_years (is_active)
  WHERE is_active = 1;

CREATE TABLE IF NOT EXISTS global_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_audit_log (
  id TEXT PRIMARY KEY NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'USER',
  actor_user_id TEXT,
  actor_name_snapshot TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  CONSTRAINT chk_system_audit_actor_invariant CHECK (
    ("actor_type" = 'USER' AND "actor_user_id" IS NOT NULL) OR
    ("actor_type" = 'SYSTEM' AND "actor_user_id" IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_system_audit_created ON system_audit_log (created_at, id);

CREATE TABLE IF NOT EXISTS backup_records (
  id TEXT PRIMARY KEY NOT NULL,
  backup_path TEXT NOT NULL,
  backup_date TEXT NOT NULL,
  status TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  academic_years_included_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Immutability Triggers for system_audit_log
CREATE TRIGGER IF NOT EXISTS trg_prevent_system_audit_update
BEFORE UPDATE ON system_audit_log
BEGIN
  SELECT RAISE(ABORT, 'system_audit_log entries are immutable and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_system_audit_delete
BEFORE DELETE ON system_audit_log
BEGIN
  SELECT RAISE(ABORT, 'system_audit_log entries are immutable and cannot be deleted');
END;
