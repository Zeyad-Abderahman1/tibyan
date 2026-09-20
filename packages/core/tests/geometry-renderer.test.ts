import { describe, expect, it } from 'vitest';
import { renderGeometrySvg } from '../src/geometry/geometry-renderer.js';

describe('deterministic exam geometry renderer', () => {
  const scene = {
    width: 240,
    height: 160,
    primitives: [
      { type: 'axis', x: 20, y: 130, length: 180, label: 'س' },
      { type: 'point', id: 'A', x: 40, y: 100, label: 'أ' },
      { type: 'point', id: 'B', x: 180, y: 40, label: 'ب' },
      { type: 'segment', from: 'A', to: 'B' },
      { type: 'angle', vertex: 'A', from: 'B', to: 'axis-x', label: 'θ' },
    ],
  } as const;

  it('renders a stable offline SVG with Arabic-safe labels', () => {
    const first = renderGeometrySvg(scene);
    const second = renderGeometrySvg(scene);

    expect(first).toBe(second);
    expect(first).toContain('<svg');
    expect(first).toContain('أ');
    expect(first).not.toMatch(/<script|javascript:|onload=/i);
  });

  it('rejects unsafe annotations and unresolved point references', () => {
    expect(() => renderGeometrySvg({ ...scene, primitives: [{ type: 'annotation', x: 1, y: 1, text: '<script>x</script>' }] })).toThrow();
    expect(() => renderGeometrySvg({ ...scene, primitives: [{ type: 'segment', from: 'missing', to: 'A' }] })).toThrow();
  });
});
