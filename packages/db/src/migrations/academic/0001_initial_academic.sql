CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY NOT NULL,
  student_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  photo_path TEXT,
  education_system TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  language_track TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  qr_token TEXT NOT NULL UNIQUE,
  barcode_value TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_students_status ON students (status);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students (grade_level, education_system);
CREATE INDEX IF NOT EXISTS idx_students_track ON students (language_track);

CREATE TABLE IF NOT EXISTS student_notes (
  id TEXT PRIMARY KEY NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  author_user_id TEXT,
  author_name_snapshot TEXT NOT NULL,
  note_text TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'GENERAL',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_student ON student_notes (student_id);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  education_system TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  language_track TEXT NOT NULL,
  focus_math_branch TEXT,
  default_payment_type TEXT NOT NULL,
  default_payment_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT chk_groups_default_payment_amount CHECK ("default_payment_amount" >= 0)
);

CREATE INDEX IF NOT EXISTS idx_groups_status ON groups (status);
CREATE INDEX IF NOT EXISTS idx_groups_grade ON groups (grade_level, education_system);

CREATE TABLE IF NOT EXISTS group_enrollments (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  enrolled_at TEXT NOT NULL,
  left_at TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  payment_type_override TEXT,
  payment_amount_override REAL,
  created_at TEXT NOT NULL,
  CONSTRAINT chk_enrollment_payment_amount_override CHECK ("payment_amount_override" IS NULL OR "payment_amount_override" >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_group_enrollments_active
  ON group_enrollments (group_id, student_id)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON group_enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_group ON group_enrollments (group_id);

CREATE TABLE IF NOT EXISTS group_schedules (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT chk_schedule_weekday CHECK ("weekday" BETWEEN 0 AND 6),
  CONSTRAINT chk_schedule_duration CHECK ("duration_minutes" > 0)
);

CREATE INDEX IF NOT EXISTS idx_schedules_group ON group_schedules (group_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  schedule_id TEXT REFERENCES group_schedules(id) ON DELETE SET NULL,
  occurrence_key TEXT NOT NULL UNIQUE,
  scheduled_date TEXT NOT NULL,
  scheduled_start_time TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  effective_start_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  reschedule_reason TEXT,
  rescheduled_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CONSTRAINT chk_session_duration CHECK ("duration_minutes" > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_occurrence ON sessions (occurrence_key);
CREATE INDEX IF NOT EXISTS idx_sessions_effective_slot ON sessions (group_id, effective_date, effective_start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_effective_date ON sessions (effective_date);

CREATE TABLE IF NOT EXISTS academic_audit_log (
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
  CONSTRAINT chk_academic_audit_actor_invariant CHECK (
    ("actor_type" = 'USER' AND "actor_user_id" IS NOT NULL) OR
    ("actor_type" = 'SYSTEM' AND "actor_user_id" IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_academic_audit_created ON academic_audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_academic_audit_entity ON academic_audit_log (entity_type, entity_id);

-- Immutability Triggers for academic_audit_log
CREATE TRIGGER IF NOT EXISTS trg_prevent_academic_audit_update
BEFORE UPDATE ON academic_audit_log
BEGIN
  SELECT RAISE(ABORT, 'academic_audit_log entries are immutable and cannot be updated');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_academic_audit_delete
BEFORE DELETE ON academic_audit_log
BEGIN
  SELECT RAISE(ABORT, 'academic_audit_log entries are immutable and cannot be deleted');
END;
