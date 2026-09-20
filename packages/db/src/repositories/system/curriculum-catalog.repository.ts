import { eq, and, desc, like, or, isNull } from 'drizzle-orm';
import { type SystemDrizzle } from '../../connection.js';
import {
  curriculumCatalogs,
  type CurriculumCatalogRow,
  type NewCurriculumCatalogRow,
} from '../../schema/system.schema.js';
import {
  EducationSystem,
  GradeLevel,
  LanguageTrack,
  MathBranch,
  CurriculumCatalogStatus,
} from '@tibyan/contracts';

export class CurriculumCatalogRepository {
  constructor(private readonly db: SystemDrizzle) {}

  findById(id: string): CurriculumCatalogRow | null {
    const row = this.db
      .select()
      .from(curriculumCatalogs)
      .where(eq(curriculumCatalogs.id, id))
      .get();
    return row ?? null;
  }

  findByCode(code: string, version?: number): CurriculumCatalogRow | null {
    if (version !== undefined) {
      const row = this.db
        .select()
        .from(curriculumCatalogs)
        .where(
          and(
            eq(curriculumCatalogs.code, code),
            eq(curriculumCatalogs.version, version)
          )
        )
        .get();
      return row ?? null;
    }

    const row = this.db
      .select()
      .from(curriculumCatalogs)
      .where(eq(curriculumCatalogs.code, code))
      .orderBy(desc(curriculumCatalogs.version))
      .get();
    return row ?? null;
  }

  findByScope(
    educationSystem: EducationSystem,
    gradeLevel: GradeLevel,
    languageTrack: LanguageTrack,
    mathBranch?: MathBranch | null,
    version?: number
  ): CurriculumCatalogRow | null {
    const conditions = [
      eq(curriculumCatalogs.educationSystem, educationSystem),
      eq(curriculumCatalogs.gradeLevel, gradeLevel),
      eq(curriculumCatalogs.languageTrack, languageTrack),
    ];

    if (mathBranch !== undefined && mathBranch !== null) {
      conditions.push(eq(curriculumCatalogs.mathBranch, mathBranch));
    } else {
      conditions.push(isNull(curriculumCatalogs.mathBranch));
    }

    if (version !== undefined) {
      conditions.push(eq(curriculumCatalogs.version, version));
    }

    const row = this.db
      .select()
      .from(curriculumCatalogs)
      .where(and(...conditions))
      .orderBy(desc(curriculumCatalogs.version))
      .get();

    return row ?? null;
  }

  getLatestScopeVersion(
    educationSystem: EducationSystem,
    gradeLevel: GradeLevel,
    languageTrack: LanguageTrack,
    mathBranch?: MathBranch | null
  ): number {
    const latest = this.findByScope(educationSystem, gradeLevel, languageTrack, mathBranch);
    return latest ? latest.version : 0;
  }

  getNextVersion(
    educationSystem: EducationSystem,
    gradeLevel: GradeLevel,
    languageTrack: LanguageTrack,
    mathBranch?: MathBranch | null
  ): number {
    return this.getLatestScopeVersion(educationSystem, gradeLevel, languageTrack, mathBranch) + 1;
  }

  list(filter?: {
    educationSystem?: EducationSystem;
    gradeLevel?: GradeLevel;
    languageTrack?: LanguageTrack;
    mathBranch?: MathBranch | null;
    status?: CurriculumCatalogStatus;
    search?: string;
  }): CurriculumCatalogRow[] {
    const conditions = [];

    if (filter?.educationSystem) {
      conditions.push(eq(curriculumCatalogs.educationSystem, filter.educationSystem));
    }
    if (filter?.gradeLevel) {
      conditions.push(eq(curriculumCatalogs.gradeLevel, filter.gradeLevel));
    }
    if (filter?.languageTrack) {
      conditions.push(eq(curriculumCatalogs.languageTrack, filter.languageTrack));
    }
    if (filter?.mathBranch !== undefined) {
      if (filter.mathBranch === null) {
        conditions.push(isNull(curriculumCatalogs.mathBranch));
      } else {
        conditions.push(eq(curriculumCatalogs.mathBranch, filter.mathBranch));
      }
    }
    if (filter?.status) {
      conditions.push(eq(curriculumCatalogs.status, filter.status));
    }
    if (filter?.search) {
      const pattern = `%${filter.search}%`;
      conditions.push(
        or(
          like(curriculumCatalogs.title, pattern),
          like(curriculumCatalogs.code, pattern),
          like(curriculumCatalogs.description, pattern)
        )
      );
    }

    return this.db
      .select()
      .from(curriculumCatalogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        curriculumCatalogs.gradeLevel,
        curriculumCatalogs.title,
        desc(curriculumCatalogs.version)
      )
      .all();
  }

  create(data: NewCurriculumCatalogRow): CurriculumCatalogRow {
    return this.db.insert(curriculumCatalogs).values(data).returning().get();
  }

  update(id: string, data: Partial<NewCurriculumCatalogRow>): CurriculumCatalogRow {
    const updated = this.db
      .update(curriculumCatalogs)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(curriculumCatalogs.id, id))
      .returning()
      .get();

    if (!updated) {
      throw new Error(`Curriculum catalog with id '${id}' not found`);
    }
    return updated;
  }
}
