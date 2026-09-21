import crypto from 'crypto';
import {
  type SlideDeckDto,
  type SlideDeckWithSlides,
  type CreateSlideDeckInput,
  type UpdateSlideDeckInput,
  type SlideDto,
  type CreateSlideInput,
  type UpdateSlideInput,
  type ReorderSlidesInput,
  type SlideBlockDto,
  type CreateSlideBlockInput,
  type UpdateSlideBlockInput,
  type ReorderSlideBlocksInput,
  type MoveSlideBlockInput,
  type SlidePresentation,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  SlideDeckRepository,
  SlideRepository,
  SlideBlockRepository,
  type SlideDeckRow,
  type SlideRow,
  type SlideBlockRow,
} from '@tibyan/db';

export type SlideErrorCode =
  | 'DECK_NOT_FOUND'
  | 'SLIDE_NOT_FOUND'
  | 'BLOCK_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'PERMISSION_DENIED';

export class SlideError extends Error {
  constructor(public readonly code: SlideErrorCode, message: string) {
    super(message);
    this.name = 'SlideError';
  }
}

function uuid(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

function toDeckDto(row: SlideDeckRow, slideCount: number): SlideDeckDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    curriculumNodeId: row.curriculumNodeId ?? undefined,
    groupId: row.groupId ?? undefined,
    status: row.status as 'DRAFT' | 'PUBLISHED',
    slideCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSlideDto(row: SlideRow, blockCount: number): SlideDto {
  return {
    id: row.id,
    deckId: row.deckId,
    title: row.title ?? undefined,
    position: row.position,
    notes: row.notes ?? undefined,
    blockCount,
    createdAt: row.createdAt,
  };
}

function toBlockDto(row: SlideBlockRow): SlideBlockDto {
  return {
    id: row.id,
    slideId: row.slideId,
    blockType: row.blockType as SlideBlockDto['blockType'],
    contentJson: row.contentJson,
    questionId: row.questionId ?? undefined,
    position: row.position,
    createdAt: row.createdAt,
  };
}

export class SlideService {
  private readonly deckRepo: SlideDeckRepository;
  private readonly slideRepo: SlideRepository;
  private readonly blockRepo: SlideBlockRepository;

  constructor(academicDb: AcademicDrizzle) {
    this.deckRepo = new SlideDeckRepository(academicDb);
    this.slideRepo = new SlideRepository(academicDb);
    this.blockRepo = new SlideBlockRepository(academicDb);
  }

  listDecks(): SlideDeckDto[] {
    const decks = this.deckRepo.list();
    return decks.map((d) => {
      const slides = this.slideRepo.listByDeck(d.id);
      return toDeckDto(d, slides.length);
    });
  }

  getDeck(id: string): SlideDeckWithSlides {
    const deck = this.deckRepo.findById(id);
    if (!deck) throw new SlideError('DECK_NOT_FOUND', `Slide deck not found: ${id}`);
    const slides = this.slideRepo.listByDeck(id);
    return {
      ...toDeckDto(deck, slides.length),
      slides: slides.map((s) => ({
        ...toSlideDto(s, 0),
        blocks: this.blockRepo.listBySlide(s.id).map(toBlockDto),
      })),
    };
  }

  createDeck(input: CreateSlideDeckInput): SlideDeckDto {
    const id = uuid();
    const ts = now();
    const row = this.deckRepo.create({
      id,
      title: input.title,
      description: input.description ?? null,
      curriculumNodeId: input.curriculumNodeId ?? null,
      groupId: input.groupId ?? null,
      status: 'DRAFT',
      createdAt: ts,
      updatedAt: ts,
    });
    return toDeckDto(row, 0);
  }

  updateDeck(id: string, input: UpdateSlideDeckInput): SlideDeckDto {
    const existing = this.deckRepo.findById(id);
    if (!existing) throw new SlideError('DECK_NOT_FOUND', `Slide deck not found: ${id}`);
    const updated = this.deckRepo.update(id, {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description ?? null }),
      ...(input.curriculumNodeId !== undefined && { curriculumNodeId: input.curriculumNodeId ?? null }),
      ...(input.groupId !== undefined && { groupId: input.groupId ?? null }),
    });
    const slideCount = this.slideRepo.listByDeck(id).length;
    return toDeckDto(updated, slideCount);
  }

  deleteDeck(id: string): void {
    const existing = this.deckRepo.findById(id);
    if (!existing) throw new SlideError('DECK_NOT_FOUND', `Slide deck not found: ${id}`);
    this.deckRepo.delete(id);
  }

  addSlide(input: CreateSlideInput): SlideDto {
    const deck = this.deckRepo.findById(input.deckId);
    if (!deck) throw new SlideError('DECK_NOT_FOUND', `Slide deck not found: ${input.deckId}`);
    const existingSlides = this.slideRepo.listByDeck(input.deckId);
    const position = input.position ?? existingSlides.length;
    const id = uuid();
    const row = this.slideRepo.create({
      id,
      deckId: input.deckId,
      title: input.title ?? null,
      position,
      notes: input.notes ?? null,
      createdAt: now(),
    });
    return toSlideDto(row, 0);
  }

  updateSlide(id: string, input: UpdateSlideInput): SlideDto {
    const existing = this.slideRepo.findById(id);
    if (!existing) throw new SlideError('SLIDE_NOT_FOUND', `Slide not found: ${id}`);
    const updated = this.slideRepo.update(id, {
      ...(input.title !== undefined && { title: input.title ?? null }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
    });
    const blockCount = this.blockRepo.listBySlide(id).length;
    return toSlideDto(updated, blockCount);
  }

  deleteSlide(id: string): void {
    const existing = this.slideRepo.findById(id);
    if (!existing) throw new SlideError('SLIDE_NOT_FOUND', `Slide not found: ${id}`);
    this.slideRepo.delete(id);
  }

  duplicateSlide(id: string): SlideDto {
    const existing = this.slideRepo.findById(id);
    if (!existing) throw new SlideError('SLIDE_NOT_FOUND', `Slide not found: ${id}`);
    const blocks = this.blockRepo.listBySlide(id);
    const newSlideId = uuid();
    const ts = now();
    const newSlide = this.slideRepo.create({
      id: newSlideId,
      deckId: existing.deckId,
      title: existing.title ? `${existing.title} (نسخة)` : null,
      position: existing.position + 1,
      notes: existing.notes,
      createdAt: ts,
    });
    for (const block of blocks) {
      this.blockRepo.create({
        id: uuid(),
        slideId: newSlideId,
        blockType: block.blockType,
        contentJson: block.contentJson,
        questionId: block.questionId,
        position: block.position,
        createdAt: ts,
      });
    }
    return toSlideDto(newSlide, blocks.length);
  }

  reorderSlides(input: ReorderSlidesInput): void {
    const deck = this.deckRepo.findById(input.deckId);
    if (!deck) throw new SlideError('DECK_NOT_FOUND', `Slide deck not found: ${input.deckId}`);
    this.slideRepo.reorder(input.deckId, input.slideIds);
  }

  addBlock(input: CreateSlideBlockInput): SlideBlockDto {
    const slide = this.slideRepo.findById(input.slideId);
    if (!slide) throw new SlideError('SLIDE_NOT_FOUND', `Slide not found: ${input.slideId}`);
    const existingBlocks = this.blockRepo.listBySlide(input.slideId);
    const position = input.position ?? existingBlocks.length;
    const id = uuid();
    const row = this.blockRepo.create({
      id,
      slideId: input.slideId,
      blockType: input.blockType,
      contentJson: input.contentJson,
      questionId: input.questionId ?? null,
      position,
      createdAt: now(),
    });
    return toBlockDto(row);
  }

  updateBlock(id: string, input: UpdateSlideBlockInput): SlideBlockDto {
    const existing = this.blockRepo.findById(id);
    if (!existing) throw new SlideError('BLOCK_NOT_FOUND', `Slide block not found: ${id}`);
    const updated = this.blockRepo.update(id, {
      ...(input.contentJson !== undefined && { contentJson: input.contentJson }),
      ...(input.questionId !== undefined && { questionId: input.questionId ?? null }),
    });
    return toBlockDto(updated);
  }

  deleteBlock(id: string): void {
    const existing = this.blockRepo.findById(id);
    if (!existing) throw new SlideError('BLOCK_NOT_FOUND', `Slide block not found: ${id}`);
    this.blockRepo.delete(id);
  }

  reorderBlocks(input: ReorderSlideBlocksInput): void {
    const slide = this.slideRepo.findById(input.slideId);
    if (!slide) throw new SlideError('SLIDE_NOT_FOUND', `Slide not found: ${input.slideId}`);
    this.blockRepo.reorder(input.slideId, input.blockIds);
  }

  moveBlock(input: MoveSlideBlockInput): SlideBlockDto {
    const block = this.blockRepo.findById(input.blockId);
    if (!block) throw new SlideError('BLOCK_NOT_FOUND', `Slide block not found: ${input.blockId}`);
    const targetSlide = this.slideRepo.findById(input.targetSlideId);
    if (!targetSlide) throw new SlideError('SLIDE_NOT_FOUND', `Target slide not found: ${input.targetSlideId}`);
    if (block.slideId === input.targetSlideId) {
      const slideBlocks = this.blockRepo.listBySlide(input.targetSlideId);
      const otherBlocks = slideBlocks.filter((b) => b.id !== block.id);
      otherBlocks.splice(input.position, 0, block);
      this.blockRepo.reorder(input.targetSlideId, otherBlocks.map((b) => b.id));
    } else {
      this.blockRepo.delete(block.id);
      const newBlock = this.blockRepo.create({
        id: block.id,
        slideId: input.targetSlideId,
        blockType: block.blockType,
        contentJson: block.contentJson,
        questionId: block.questionId,
        position: input.position,
        createdAt: block.createdAt,
      });
      return toBlockDto(newBlock);
    }
    const updated = this.blockRepo.findById(input.blockId);
    return toBlockDto(updated!);
  }

  getPresentation(deckId: string): SlidePresentation {
    const deck = this.deckRepo.findById(deckId);
    if (!deck) throw new SlideError('DECK_NOT_FOUND', `Slide deck not found: ${deckId}`);
    const slides = this.slideRepo.listByDeck(deckId);
    return {
      deck: toDeckDto(deck, slides.length),
      slides: slides.map((s) => ({
        ...toSlideDto(s, 0),
        blocks: this.blockRepo.listBySlide(s.id).map((b) => ({
          ...toBlockDto(b),
        })),
      })),
    };
  }
}
