/**
 * KaTeX Renderer — Server-side (Node.js/Electron main process) math rendering.
 *
 * Provides injectable KaTeX module to avoid pnpm strict resolution issues.
 * The runtime that creates ExamService injects the katex module once at startup.
 */

let katexModule: any = null;

/**
 * Inject the KaTeX module from the runtime layer where it can be properly resolved.
 * Must be called once before any renderMathToStaticHtml calls.
 */
export function injectKatex(katex: any): void {
  katexModule = katex;
}

/**
 * Renders a LaTeX mathematical expression to safe, offline static HTML using KaTeX.
 * Returns an HTML string formatted with KaTeX classes and strict LTR direction.
 */
export function renderMathToStaticHtml(latex: string, displayMode = false): string {
  if (katexModule) {
    try {
      const rendered = katexModule.renderToString(latex, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: false,
        output: 'html', // Avoid http:// namespace attributes from MathML
      });
      return `<span class="math font-math" dir="ltr" style="direction:ltr;unicode-bidi:isolate;">${rendered}</span>`;
    } catch {
      // Fall through to escaped fallback
    }
  }

  const escaped = String(latex)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<span class="math" dir="ltr">${escaped}</span>`;
}
