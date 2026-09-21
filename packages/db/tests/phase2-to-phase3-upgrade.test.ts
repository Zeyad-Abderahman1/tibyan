import { describe, it, expect } from 'vitest';
import {
  createRawDatabase,
  SYSTEM_MIGRATIONS,
  ACADEMIC_MIGRATIONS,
  getAppliedMigrations,
  runMigrations,
  migrateSystemDatabase,
  migrateAcademicDatabase,
} from '../src/index.js';

describe('Phase-2 to Phase-3 Database Upgrade Verification', () => {
  it('cleanly upgrades System DB from Phase 2 (0001) to Phase 3 (0003) preserving pre-existing records', () => {
    const rawDb = createRawDatabase(':memory:');

    // 1. Apply Phase-2 system migrations (0000 and 0001 only)
    runMigrations(rawDb, SYSTEM_MIGRATIONS.slice(0, 2));

    expect(getAppliedMigrations(rawDb)).toEqual(['0000_initial_schema', '0001_audit_triggers']);

    // 2. Insert pre-existing Phase 2 data
    rawDb.prepare(`
      INSERT INTO users (id, full_name, username, pin_hash, salt, role, status, failed_attempts, created_at, updated_at)
      VALUES ('u-owner', 'مالك المنظومة', 'owner_test', 'hash123', 'salt123', 'OWNER', 'ACTIVE', 0, '2026-01-01', '2026-01-01')
    `).run();

    rawDb.prepare(`
      INSERT INTO academic_years (id, name, db_filename, is_active, is_archived, created_at, updated_at)
      VALUES ('ay-2025', '2025-2026', 'tibyan-academic-2025.sqlite', 1, 0, '2026-01-01', '2026-01-01')
    `).run();

    // 3. Upgrade to Phase 3 via migrator
    const newlyApplied = migrateSystemDatabase(rawDb);
    expect(newlyApplied).toEqual(['0002_overrated_naoko', '0003_uneven_vengeance', '0004_certain_stellaris', '0005_assistant_tables', '0006_curriculum_library_metadata']);
    expect(getAppliedMigrations(rawDb)).toEqual([
      '0000_initial_schema',
      '0001_audit_triggers',
      '0002_overrated_naoko',
      '0003_uneven_vengeance',
      '0004_certain_stellaris',
      '0005_assistant_tables',
      '0006_curriculum_library_metadata',
    ]);

    // 4. Verify Phase 2 data preserved
    const user = rawDb.prepare('SELECT * FROM users WHERE id = ?').get('u-owner') as any;
    expect(user.full_name).toBe('مالك المنظومة');

    const year = rawDb.prepare('SELECT * FROM academic_years WHERE id = ?').get('ay-2025') as any;
    expect(year.is_active).toBe(1);

    // 5. Verify Phase 3 tables exist and enforce null-safe uniqueness
    rawDb.prepare(`
      INSERT INTO curriculum_catalogs (id, code, title, education_system, grade_level, language_track, math_branch, version, status, created_at, updated_at)
      VALUES ('c1', 'CAT-1', 'منهج 1', 'GENERAL', 'SEC_1', 'ARABIC', NULL, 1, 'DRAFT', '2026-09-20', '2026-09-20')
    `).run();

    // Duplicate unbranched catalog must be rejected by partial unique index
    expect(() => {
      rawDb.prepare(`
        INSERT INTO curriculum_catalogs (id, code, title, education_system, grade_level, language_track, math_branch, version, status, created_at, updated_at)
        VALUES ('c2', 'CAT-2', 'منهج 2 مكرر', 'GENERAL', 'SEC_1', 'ARABIC', NULL, 1, 'DRAFT', '2026-09-20', '2026-09-20')
      `).run();
    }).toThrow();

    rawDb.close();
  });

  it('cleanly upgrades Academic DB from Phase 2 (0006) to Phase 3 (0007) preserving pre-existing records', () => {
    const rawDb = createRawDatabase(':memory:');

    // 1. Apply Phase-2 academic migrations (0000 to 0006)
    runMigrations(rawDb, ACADEMIC_MIGRATIONS.slice(0, 7));

    expect(getAppliedMigrations(rawDb)).toEqual([
      '0000_initial_schema',
      '0001_audit_triggers',
      '0002_glamorous_sunspot',
      '0003_neat_krista_starr',
      '0004_cold_bullseye',
      '0005_rainy_silvermane',
      '0006_parched_xavin',
    ]);

    // 2. Insert pre-existing Phase 2 academic data
    rawDb.prepare(`
      INSERT INTO groups (id, name, education_system, grade_level, language_track, focus_math_branch, default_payment_type, default_payment_amount, status, created_at, updated_at)
      VALUES ('grp-existing', 'مجموعة قائمة من المرحلة 2', 'GENERAL', 'PREP_1', 'ARABIC', NULL, 'MONTHLY', 200, 'ACTIVE', '2026-01-01', '2026-01-01')
    `).run();

    // 3. Upgrade through every registered migration; legacy Phase 2 files must reach Phase 4 intact.
    const newlyApplied = migrateAcademicDatabase(rawDb);
    expect(newlyApplied).toEqual(['0007_awesome_sunspot', '0008_nifty_magus', '0009_exotic_carmella_unuscione', '0010_phase5_capture_grading_analytics', '0011_slide_decks']);
    expect(getAppliedMigrations(rawDb)).toEqual([
      '0000_initial_schema',
      '0001_audit_triggers',
      '0002_glamorous_sunspot',
      '0003_neat_krista_starr',
      '0004_cold_bullseye',
      '0005_rainy_silvermane',
      '0006_parched_xavin',
      '0007_awesome_sunspot',
      '0008_nifty_magus',
      '0009_exotic_carmella_unuscione',
      '0010_phase5_capture_grading_analytics',
      '0011_slide_decks',
    ]);

    // 4. Verify Phase 2 data preserved
    const grp = rawDb.prepare('SELECT * FROM groups WHERE id = ?').get('grp-existing') as any;
    expect(grp.name).toBe('مجموعة قائمة من المرحلة 2');

    // 5. Verify Phase 3 group_curriculum_assignments and progress tables work
    rawDb.prepare(`
      INSERT INTO group_curriculum_assignments (id, group_id, catalog_id, catalog_version, assigned_at, assigned_name_snapshot, created_at, updated_at)
      VALUES ('asgn-1', 'grp-existing', 'cat-sys-1', 1, '2026-09-20', 'System Engine', '2026-09-20', '2026-09-20')
    `).run();

    const asgn = rawDb.prepare('SELECT * FROM group_curriculum_assignments WHERE id = ?').get('asgn-1') as any;
    expect(asgn.catalog_id).toBe('cat-sys-1');

    rawDb.close();
  });
});
