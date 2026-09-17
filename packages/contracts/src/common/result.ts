export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export function successResult<T>(data: T): IpcResult<T> {
  return { success: true, data };
}

export function errorResult(code: string, message: string, details?: unknown): IpcResult<never> {
  return { success: false, error: { code, message, details } };
}
