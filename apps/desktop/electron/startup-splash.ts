export interface StartupSplashOptions {
  theme?: 'light' | 'dark';
  error?: string | null;
}

type ReadyWindow = {
  once(event: 'ready-to-show', listener: () => void): unknown;
  show(): void;
  isDestroyed(): boolean;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function showWhenReady(window: ReadyWindow): void {
  window.once('ready-to-show', () => {
    if (!window.isDestroyed()) window.show();
  });
}

export function createStartupSplashHtml({ theme = 'dark', error = null }: StartupSplashOptions = {}): string {
  const dark = theme === 'dark';
  const background = dark ? '#0C1422' : '#F7F6F2';
  const surface = dark ? '#121D2E' : '#FFFFFF';
  const text = dark ? '#F3F1EA' : '#172033';
  const secondary = dark ? '#AAB3C2' : '#626B7B';
  const primary = dark ? '#7893C5' : '#243B67';
  const border = dark ? '#26364E' : '#DDE1E8';
  const safeError = error ? escapeHtml(error) : '';

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="color-scheme" content="${theme}">
<style>
*{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;background:${background};color:${text};font-family:"Segoe UI",Tahoma,Arial,sans-serif;overflow:hidden}
body{display:grid;place-items:center}.stage{text-align:center;padding:32px}.mark{width:68px;height:68px;margin:0 auto 18px;border:1px solid ${border};border-radius:18px;background:${surface};display:grid;place-items:center;box-shadow:0 8px 30px rgba(0,0,0,.1)}
.glyph{font-size:28px;font-weight:800;color:${primary}}h1{font-size:34px;line-height:1.2;margin:0;color:${text}}.subtitle{font-size:14px;margin:6px 0 0;color:${secondary}}.status{font-size:14px;margin:18px 0 0;color:${secondary}}
.loader{height:24px;margin-top:24px;display:flex;align-items:end;justify-content:center;gap:6px;color:${primary};}
.loader i{display:block;width:6px;height:12px;border-radius:8px;background:currentColor;animation:pulse 1s ease-in-out infinite alternate}
.loader i:nth-child(2){height:20px;animation-delay:.15s}
.loader i:nth-child(3){animation-delay:.3s}
.error{max-width:420px;margin-top:24px;padding:16px 18px;border:1px solid #8F3C48;border-radius:12px;background:${surface};color:${text}}.error strong{display:block;color:#D56B76;margin-bottom:6px}.error span{font-size:13px;color:${secondary}}
@keyframes pulse{from{opacity:.35;transform:scaleY(.75)}to{opacity:1;transform:scaleY(1)}}@media(prefers-reduced-motion:reduce){.loader i{animation:none;opacity:.8}}
</style></head><body><main class="stage"><div class="mark"><span class="glyph">ت</span></div><h1>تِبيان</h1><p class="subtitle">نظام إدارة المعلم الذكي</p>${error ? `<div class="error"><strong>تعذر بدء تشغيل تِبيان</strong><span>${safeError}</span></div>` : '<div class="loader" aria-hidden="true"><i></i><i></i><i></i></div><p class="status">جاري تجهيز مساحة العمل...</p>'}</main></body></html>`;
}

export function toStartupDataUrl(options?: StartupSplashOptions): string {
  return `data:text/html;charset=UTF-8,${encodeURIComponent(createStartupSplashHtml(options))}`;
}
