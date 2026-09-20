import { afterEach, describe, expect, it } from 'vitest';
import { closeAcademicDatabase, openAcademicDatabase } from '../src/index.js';

describe('exam Academic DB migration', () => {
  afterEach(() => closeAcademicDatabase());

  it('creates exam tables without cross-database question foreign keys', () => {
    const connection = openAcademicDatabase('2026-2027', { filePath: ':memory:' });
    const definitions = connection.raw.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name IN ('exams', 'exam_sections', 'exam_questions', 'exam_versions')").all() as Array<{ name: string; sql: string }>;
    expect(definitions.map((table) => table.name).sort()).toEqual(['exam_questions', 'exam_sections', 'exam_versions', 'exams']);
    expect(definitions.find((table) => table.name === 'exam_questions')?.sql).not.toContain('REFERENCES questions');
  });
});
