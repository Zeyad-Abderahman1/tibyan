/**
 * KaTeX resolver for the Electron main process.
 *
 * Uses a static import of katex so Vite bundles it directly into the main
 * process output, avoiding runtime resolution issues in the packaged asar.
 */
import katex from 'katex';

let _katex: any = null;

export function getKatexModule(): any {
  if (_katex) return _katex;
  _katex = katex;
  return _katex;
}
