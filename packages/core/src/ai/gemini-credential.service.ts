export interface EncryptedSettingsStore { get(key: string): string | undefined; set(key: string, value: string): void; }
export interface CredentialCipher { isEncryptionAvailable(): boolean; encryptString(value: string): string; decryptString(value: string): string; }

/** Core-owned boundary; callers must never pass this value through renderer IPC. */
export class GeminiCredentialService {
  private static readonly key = 'ai.gemini.credential';
  constructor(private readonly store: EncryptedSettingsStore, private readonly cipher: CredentialCipher) {}
  save(apiKey: string): void {
    if (!apiKey.trim() || !this.cipher.isEncryptionAvailable()) throw new Error('تعذر تأمين مفتاح الذكاء الاصطناعي');
    this.store.set(GeminiCredentialService.key, this.cipher.encryptString(apiKey));
  }
  get(): string | null {
    const encrypted = this.store.get(GeminiCredentialService.key);
    return encrypted ? this.cipher.decryptString(encrypted) : null;
  }
  clear(): void { this.store.set(GeminiCredentialService.key, ''); }
}
