import { eq, asc } from 'drizzle-orm';
import { type AcademicDrizzle } from '../../connection.js';
import {
  slideDecks,
  slides,
  slideBlocks,
  type SlideDeckRow,
  type NewSlideDeckRow,
  type SlideRow,
  type NewSlideRow,
  type SlideBlockRow,
  type NewSlideBlockRow,
} from '../../schema/academic.schema.js';

export class SlideDeckRepository {
  constructor(private readonly db: AcademicDrizzle) {}

  create(data: NewSlideDeckRow): SlideDeckRow {
    return this.db.insert(slideDecks).values(data).returning().get();
  }

  findById(id: string): SlideDeckRow | null {
    return this.db.select().from(slideDecks).where(eq(slideDecks.id, id)).get() ?? null;
  }

  list(): SlideDeckRow[] {
    return this.db.select().from(slideDecks).all();
  }

  update(id: string, partial: Partial<NewSlideDeckRow>): SlideDeckRow {
    const updated = this.db
      .update(slideDecks)
      .set({ ...partial, updatedAt: new Date().toISOString() })
      .where(eq(slideDecks.id, id))
      .returning()
      .get();
    if (!updated) throw new Error(`Slide deck not found: ${id}`);
    return updated;
  }

  delete(id: string): void {
    this.db.delete(slideDecks).where(eq(slideDecks.id, id)).run();
  }
}

export class SlideRepository {
  constructor(private readonly db: AcademicDrizzle) {}

  create(data: NewSlideRow): SlideRow {
    return this.db.insert(slides).values(data).returning().get();
  }

  findById(id: string): SlideRow | null {
    return this.db.select().from(slides).where(eq(slides.id, id)).get() ?? null;
  }

  listByDeck(deckId: string): SlideRow[] {
    return this.db
      .select()
      .from(slides)
      .where(eq(slides.deckId, deckId))
      .orderBy(asc(slides.position))
      .all();
  }

  update(id: string, partial: Partial<NewSlideRow>): SlideRow {
    const updated = this.db
      .update(slides)
      .set(partial)
      .where(eq(slides.id, id))
      .returning()
      .get();
    if (!updated) throw new Error(`Slide not found: ${id}`);
    return updated;
  }

  delete(id: string): void {
    this.db.delete(slides).where(eq(slides.id, id)).run();
  }

  deleteByDeck(deckId: string): void {
    this.db.delete(slides).where(eq(slides.deckId, deckId)).run();
  }

  reorder(_deckId: string, orderedIds: string[]): void {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if (id) {
        this.db
          .update(slides)
          .set({ position: i })
          .where(eq(slides.id, id))
          .run();
      }
    }
  }
}

export class SlideBlockRepository {
  constructor(private readonly db: AcademicDrizzle) {}

  create(data: NewSlideBlockRow): SlideBlockRow {
    return this.db.insert(slideBlocks).values(data).returning().get();
  }

  findById(id: string): SlideBlockRow | null {
    return this.db.select().from(slideBlocks).where(eq(slideBlocks.id, id)).get() ?? null;
  }

  listBySlide(slideId: string): SlideBlockRow[] {
    return this.db
      .select()
      .from(slideBlocks)
      .where(eq(slideBlocks.slideId, slideId))
      .orderBy(asc(slideBlocks.position))
      .all();
  }

  update(id: string, partial: Partial<NewSlideBlockRow>): SlideBlockRow {
    const updated = this.db
      .update(slideBlocks)
      .set(partial)
      .where(eq(slideBlocks.id, id))
      .returning()
      .get();
    if (!updated) throw new Error(`Slide block not found: ${id}`);
    return updated;
  }

  delete(id: string): void {
    this.db.delete(slideBlocks).where(eq(slideBlocks.id, id)).run();
  }

  reorder(_slideId: string, orderedIds: string[]): void {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      if (id) {
        this.db
          .update(slideBlocks)
          .set({ position: i })
          .where(eq(slideBlocks.id, id))
          .run();
      }
    }
  }
}
