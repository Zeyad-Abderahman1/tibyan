import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateSlideDeckInput,
  UpdateSlideDeckInput,
  CreateSlideInput,
  UpdateSlideInput,
  ReorderSlidesInput,
  CreateSlideBlockInput,
  UpdateSlideBlockInput,
  ReorderSlideBlocksInput,
  MoveSlideBlockInput,
} from '@tibyan/contracts';

export function useSlideDecks() {
  return useQuery({
    queryKey: ['slideDecks'],
    queryFn: async () => {
      const res = await window.tibyan.slides.listDecks();
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
  });
}

export function useSlideDeck(id: string | null) {
  return useQuery({
    queryKey: ['slideDeck', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await window.tibyan.slides.getDeck(id);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateSlideDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSlideDeckInput) => {
      const res = await window.tibyan.slides.createDeck(input);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slideDecks'] }),
  });
}

export function useUpdateSlideDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSlideDeckInput }) => {
      const res = await window.tibyan.slides.updateDeck(id, input);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['slideDecks'] });
      qc.invalidateQueries({ queryKey: ['slideDeck', vars.id] });
    },
  });
}

export function useDeleteSlideDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await window.tibyan.slides.deleteDeck(id);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slideDecks'] }),
  });
}

export function useAddSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSlideInput) => {
      const res = await window.tibyan.slides.addSlide(input);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['slideDeck', vars.deckId] }),
  });
}

export function useUpdateSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSlideInput }) => {
      const res = await window.tibyan.slides.updateSlide(id, input);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slideDeck'] }),
  });
}

export function useDeleteSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await window.tibyan.slides.deleteSlide(id);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slideDeck'] }),
  });
}

export function useDuplicateSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await window.tibyan.slides.duplicateSlide(id);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slideDeck'] }),
  });
}

export function useReorderSlides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReorderSlidesInput) => {
      const res = await window.tibyan.slides.reorderSlides(input);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['slideDeck', vars.deckId] }),
  });
}

export function useAddSlideBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSlideBlockInput) => {
      const res = await window.tibyan.slides.addBlock(input);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slideDeck'] }),
  });
}

export function useUpdateSlideBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateSlideBlockInput }) => {
      const res = await window.tibyan.slides.updateBlock(id, input);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slideDeck'] }),
  });
}

export function useDeleteSlideBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await window.tibyan.slides.deleteBlock(id);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slideDeck'] }),
  });
}

export function useReorderSlideBlocks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ReorderSlideBlocksInput) => {
      const res = await window.tibyan.slides.reorderBlocks(input);
      if (!res.success) throw new Error(res.error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slideDeck'] }),
  });
}

export function useMoveSlideBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MoveSlideBlockInput) => {
      const res = await window.tibyan.slides.moveBlock(input);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slideDeck'] }),
  });
}

export function useSlidePresentation(deckId: string | null) {
  return useQuery({
    queryKey: ['slidePresentation', deckId],
    queryFn: async () => {
      if (!deckId) return null;
      const res = await window.tibyan.slides.getPresentation(deckId);
      if (!res.success) throw new Error(res.error.message);
      return res.data;
    },
    enabled: !!deckId,
  });
}
