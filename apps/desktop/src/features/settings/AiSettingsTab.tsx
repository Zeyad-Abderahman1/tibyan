import { useEffect, useState } from 'react';
import { Button } from '@tibyan/design-system';

type Mode = 'set' | 'delete' | null;

export function AiSettingsTab() {
  const [configured, setConfigured] = useState(false);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [apiKey, setApiKey] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    const result = await window.tibyan.gemini.getStatus();
    if (result.success) { setConfigured(result.data.configured); setMaskedKey(result.data.maskedKey); }
    else setMessage(result.error.message);
  };
  useEffect(() => { void refresh(); }, []);

  const close = () => { setMode(null); setApiKey(''); setOwnerPassword(''); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mode || busy) return;
    const key = apiKey;
    const password = ownerPassword;
    setBusy(true);
    setApiKey('');
    setOwnerPassword('');
    try {
      const result = mode === 'set'
        ? await window.tibyan.gemini.setCredential({ apiKey: key, ownerPassword: password })
        : await window.tibyan.gemini.deleteCredential({ ownerPassword: password });
      if (!result.success) { setMessage(result.error.message); return; }
      close();
      setMessage(mode === 'set' ? 'تم حفظ مفتاح تِبيان الذكي.' : 'تم حذف مفتاح تِبيان الذكي.');
      await refresh();
    } finally { setBusy(false); }
  };
  const testConnection = async () => {
    setBusy(true);
    try {
      const result = await window.tibyan.gemini.testConnection();
      setMessage(result.success ? result.data.message : result.error.message);
    } finally { setBusy(false); }
  };

  return <section dir="rtl" className="space-y-5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-5" data-testid="ai-settings">
    <div><h2 className="text-lg font-bold">إعدادات تِبيان الذكية</h2><p className="text-sm text-[var(--color-text-secondary)]">حالة الخدمة: {configured ? 'مفعلة' : 'غير مفعلة'}</p></div>
    {configured && <p data-testid="ai-masked-key" dir="ltr" className="w-fit font-mono">{maskedKey}</p>}
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" onClick={() => { setMessage(''); setMode('set'); }} data-testid="ai-set-key">{configured ? 'تغيير مفتاح API' : 'إضافة مفتاح API'}</Button>
      {configured && <Button type="button" variant="danger" size="sm" onClick={() => { setMessage(''); setMode('delete'); }} data-testid="ai-delete-key">حذف مفتاح API</Button>}
      <Button type="button" variant="secondary" size="sm" disabled={!configured || busy} onClick={() => void testConnection()} data-testid="ai-test-connection">اختبار الاتصال</Button>
    </div>
    {message && <p role="status">{message}</p>}
    {mode && <div role="dialog" aria-modal="true" aria-label="تأكيد كلمة مرور المالك" className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-4">
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        {mode === 'set' && <label className="block">مفتاح API جديد<input data-testid="ai-key-input" type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} required className="block w-full border rounded p-2" /></label>}
        <label className="block">كلمة مرور المالك<input data-testid="ai-owner-password" type="password" autoComplete="off" value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} required className="block w-full border rounded p-2" /></label>
        <div className="flex gap-2"><Button type="submit" size="sm" disabled={busy}>تأكيد</Button><Button type="button" size="sm" variant="ghost" onClick={close}>إلغاء</Button></div>
      </form>
    </div>}
  </section>;
}
