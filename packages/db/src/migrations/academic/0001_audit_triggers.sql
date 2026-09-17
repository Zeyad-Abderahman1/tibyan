-- Custom Migration: Immutability triggers for academic_audit_log
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