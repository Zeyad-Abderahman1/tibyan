-- Custom Migration: Immutability triggers for system_audit_log
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