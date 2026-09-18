import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  IpcResult,
  LoginUserDto,
  ManagedUserDto,
  UserDto,
  CreateUserInput,
  UpdatePermissionsInput,
  ChangeUserStatusInput,
  ResetUserPinInput,
} from '@tibyan/contracts';

export function useUsersList() {
  return useQuery({
    queryKey: ['usersList'],
    queryFn: async (): Promise<LoginUserDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.auth?.listUsers) {
        const res = await window.tibyan.auth.listUsers();
        if (res.success) {
          return res.data;
        }
      }
      return [];
    },
    staleTime: 1000 * 30,
  });
}

export function useManagementUsersList(enabled: boolean = true) {
  return useQuery({
    queryKey: ['managementUsersList'],
    queryFn: async (): Promise<ManagedUserDto[]> => {
      if (typeof window !== 'undefined' && window.tibyan?.auth?.listManagementUsers) {
        const res = await window.tibyan.auth.listManagementUsers();
        if (res.success) {
          return res.data;
        }
        throw new Error(res.error?.message || 'تعذر جلب قائمة إدارة المستخدمين.');
      }
      return [];
    },
    enabled,
    staleTime: 1000 * 30,
  });
}

export function useCreateAssistant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput): Promise<IpcResult<UserDto>> => {
      if (!window.tibyan?.auth?.createUser) {
        throw new Error('API_NOT_AVAILABLE: window.tibyan.auth.createUser is not available');
      }
      const res = await window.tibyan.auth.createUser(input);
      if (!res.success) {
        throw new Error(res.error?.message || 'تعذر إضافة حساب المساعد الجديد.');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementUsersList'] });
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
    },
  });
}

export function useUpdatePermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdatePermissionsInput): Promise<IpcResult<void>> => {
      if (!window.tibyan?.auth?.updatePermissions) {
        throw new Error('API_NOT_AVAILABLE: window.tibyan.auth.updatePermissions is not available');
      }
      const res = await window.tibyan.auth.updatePermissions(input);
      if (!res.success) {
        throw new Error(res.error?.message || 'تعذر تعديل الصلاحيات.');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementUsersList'] });
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
    },
  });
}

export function useChangeUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ChangeUserStatusInput): Promise<IpcResult<void>> => {
      if (!window.tibyan?.auth?.changeUserStatus) {
        throw new Error('API_NOT_AVAILABLE: window.tibyan.auth.changeUserStatus is not available');
      }
      const res = await window.tibyan.auth.changeUserStatus(input);
      if (!res.success) {
        throw new Error(res.error?.message || 'تعذر تعديل حالة المستخدم.');
      }
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managementUsersList'] });
      queryClient.invalidateQueries({ queryKey: ['usersList'] });
    },
  });
}

export function useResetUserPin() {
  return useMutation({
    mutationFn: async (input: ResetUserPinInput): Promise<IpcResult<void>> => {
      if (!window.tibyan?.auth?.resetPin) {
        throw new Error('API_NOT_AVAILABLE: window.tibyan.auth.resetPin is not available');
      }
      const res = await window.tibyan.auth.resetPin(input);
      if (!res.success) {
        throw new Error(res.error?.message || 'تعذر إعادة تعيين رمز PIN.');
      }
      return res;
    },
  });
}
