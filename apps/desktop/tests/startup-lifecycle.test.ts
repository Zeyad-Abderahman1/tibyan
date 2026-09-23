import { describe, expect, it, vi } from 'vitest';
import { createStartupSplashHtml, showWhenReady } from '../electron/startup-splash.js';

describe('Electron startup splash lifecycle', () => {
  it('renders branded neutral Tibyan markup without the retired petrol color', () => {
    const html = createStartupSplashHtml({ theme: 'light' });
    expect(html).toContain('تِبيان');
    expect(html).toContain('نظام إدارة المعلم الذكي');
    expect(html).toContain('جاري تجهيز مساحة العمل');
    expect(html).toContain('#F7F6F2');
    expect(html).not.toContain('#0B3D3D');
    expect(html).toContain('prefers-reduced-motion');
  });

  it('renders a deep blue-slate dark splash with safely encoded errors', () => {
    const html = createStartupSplashHtml({
      theme: 'dark',
      error: '<script>alert("unsafe")</script>',
    });
    expect(html).toContain('#0C1422');
    expect(html).toContain('تعذر بدء تشغيل تِبيان');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });

  it('shows a hidden window once and only after ready-to-show', () => {
    let listener: (() => void) | undefined;
    const window = {
      once: vi.fn((_event: string, callback: () => void) => { listener = callback; }),
      show: vi.fn(),
      isDestroyed: vi.fn(() => false),
    };

    showWhenReady(window);
    expect(window.show).not.toHaveBeenCalled();
    expect(window.once).toHaveBeenCalledWith('ready-to-show', expect.any(Function));
    listener?.();
    expect(window.show).toHaveBeenCalledTimes(1);
  });
});
