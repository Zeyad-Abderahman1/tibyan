import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  StudentDto,
  StudentNoteDto,
  CreateStudentIpcInput,
  UpdateStudentIpcInput,
  CreateStudentNoteInput,
  StudentFilterInput,
  PhotoSelectionDto,
  IpcResult,
} from '@tibyan/contracts';

export const studentKeys = {
  all: ['students'] as const,
  lists: () => [...studentKeys.all, 'list'] as const,
  list: (filter?: StudentFilterInput) => [...studentKeys.lists(), filter ?? {}] as const,
  details: () => [...studentKeys.all, 'detail'] as const,
  detail: (id: string) => [...studentKeys.details(), id] as const,
  notes: (id: string) => [...studentKeys.all, 'notes', id] as const,
};

export function useStudentsList(filter?: StudentFilterInput) {
  return useQuery({
    queryKey: studentKeys.list(filter),
    queryFn: async (): Promise<StudentDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.students?.list) {
        const res = await window.tibyan.students.list(filter);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل قائمة الطلاب');
        }
        return res.data;
      }
      return [];
    },
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: studentKeys.detail(id),
    queryFn: async (): Promise<StudentDto> => {
      if (typeof window !== 'undefined' && window.tibyan?.students?.getById) {
        const res = await window.tibyan.students.getById(id);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل استرجاع بيانات الطالب');
        }
        return res.data;
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    enabled: Boolean(id),
  });
}

export function useStudentNotes(studentId: string) {
  return useQuery({
    queryKey: studentKeys.notes(studentId),
    queryFn: async (): Promise<StudentNoteDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.students?.listNotes) {
        const res = await window.tibyan.students.listNotes(studentId);
        if (!res.success) {
          throw new Error(res.error.message || 'فشل تحميل سجل الملاحظات');
        }
        return res.data;
      }
      return [];
    },
    enabled: Boolean(studentId),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStudentIpcInput): Promise<IpcResult<StudentDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.students?.create) {
        return window.tibyan.students.create(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (res) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
        queryClient.setQueryData(studentKeys.detail(res.data.id), res.data);
      }
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateStudentIpcInput): Promise<IpcResult<StudentDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.students?.update) {
        return window.tibyan.students.update(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (res, vars) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: studentKeys.lists() });
        queryClient.invalidateQueries({ queryKey: studentKeys.detail(vars.studentId) });
      }
    },
  });
}

export function useAddStudentNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateStudentNoteInput): Promise<IpcResult<StudentNoteDto>> => {
      if (typeof window !== 'undefined' && window.tibyan?.students?.addNote) {
        return window.tibyan.students.addNote(input);
      }
      throw new Error('API_NOT_AVAILABLE');
    },
    onSuccess: (res, vars) => {
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: studentKeys.notes(vars.studentId) });
      }
    },
  });
}

export function useChooseStudentPhoto() {
  return useMutation({
    mutationFn: async (): Promise<IpcResult<PhotoSelectionDto | null>> => {
      if (typeof window !== 'undefined' && window.tibyan?.students?.choosePhotoDialog) {
        return window.tibyan.students.choosePhotoDialog();
      }
      return { success: true, data: null };
    },
  });
}
