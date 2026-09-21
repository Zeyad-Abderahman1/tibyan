/**
 * KaTeX resolver for the Electron main process.
 *
 * Resolves katex through @tibyan/design-system's dependency chain using
 * createRequire, bypassing pnpm strict resolution since katex isn't a
 * direct dependency of @tibyan/desktop.
 */
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

let _katex: any = null;

export function getKatexModule(): any {
  if (_katex) return _katex;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Try resolving katex through design-system's dependency context
  const candidates = [
    // From electron/ → packages/design-system/ (workspace layout)
    path.resolve(__dirname, '../../../packages/design-system/package.json'),
    // From apps/desktop/electron/ → packages/design-system/
    path.resolve(__dirname, '../../packages/design-system/package.json'),
    // From dist-electron/ → node_modules/@tibyan/design-system/
    path.resolve(__dirname, '../node_modules/@tibyan/design-system/package.json'),
  ];

  for (const candidate of candidates) {
    try {
      const dsRequire = createRequire(candidate);
      _katex = dsRequire('katex');
      if (_katex) return _katex;
    } catch {}
  }

  // Fallback: try direct require from cwd
  try {
    const cwdRequire = createRequire(path.join(process.cwd(), 'package.json'));
    _katex = cwdRequire('katex');
    if (_katex) return _katex;
  } catch {}

  return null;
}
