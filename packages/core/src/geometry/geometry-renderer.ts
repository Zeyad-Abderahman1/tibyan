type Point = { type: 'point'; id: string; x: number; y: number; label?: string };
type Primitive =
  | Point
  | { type: 'segment' | 'line' | 'ray' | 'vector'; from: string; to: string; label?: string }
  | { type: 'circle'; cx: number; cy: number; r: number; label?: string }
  | { type: 'arc'; cx: number; cy: number; r: number; start: number; end: number; label?: string }
  | { type: 'polygon' | 'triangle'; points: string[]; label?: string }
  | { type: 'angle'; vertex: string; from: string; to: string; label?: string }
  | { type: 'dimension'; from: string; to: string; label: string }
  | { type: 'axis'; x: number; y: number; length: number; label?: string }
  | { type: 'coordinates'; x: number; y: number; label?: string }
  | { type: 'annotation'; x: number; y: number; text: string };

export interface GeometryScene { width: number; height: number; primitives: readonly Primitive[] }

const num = (value: number, name: string): number => {
  if (!Number.isFinite(value)) throw new Error(`قيمة هندسية غير صالحة: ${name}`);
  return value;
};
const escape = (value: string): string => {
  if (/<|>|javascript:|on[a-z]+\s*=/i.test(value)) throw new Error('تعليق هندسي غير آمن');
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
};

/** Pure, offline SVG renderer. It receives declarative geometry only and emits no executable SVG capability. */
export function renderGeometrySvg(input: GeometryScene): string {
  const width = num(input.width, 'العرض');
  const height = num(input.height, 'الارتفاع');
  if (width <= 0 || height <= 0 || width > 4000 || height > 4000 || input.primitives.length > 200) throw new Error('مشهد هندسي خارج الحدود المسموحة');
  const points = new Map<string, Point>();
  for (const primitive of input.primitives) if (primitive.type === 'point') {
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(primitive.id) || points.has(primitive.id)) throw new Error('معرّف نقطة غير صالح');
    num(primitive.x, 'x'); num(primitive.y, 'y'); points.set(primitive.id, primitive);
  }
  const at = (id: string): { x: number; y: number } => {
    if (id === 'axis-x') return { x: width, y: height / 2 };
    const point = points.get(id); if (!point) throw new Error(`نقطة مرجعية غير موجودة: ${id}`); return point;
  };
  const label = (text: string | undefined, x: number, y: number) => text ? `<text x="${x}" y="${y}" class="geo-label">${escape(text)}</text>` : '';
  const body = input.primitives.map((primitive) => {
    switch (primitive.type) {
      case 'point': return `<circle cx="${primitive.x}" cy="${primitive.y}" r="3" class="geo-point"/>${label(primitive.label, primitive.x + 6, primitive.y - 6)}`;
      case 'segment': { const a = at(primitive.from), b = at(primitive.to); return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="geo-stroke"/>${label(primitive.label, (a.x + b.x) / 2, (a.y + b.y) / 2)}`; }
      case 'line': case 'ray': case 'vector': { const a = at(primitive.from), b = at(primitive.to); const dx = b.x - a.x, dy = b.y - a.y, scale = primitive.type === 'line' ? 2000 : 1; const x1 = primitive.type === 'line' ? a.x - dx * scale : a.x, y1 = primitive.type === 'line' ? a.y - dy * scale : a.y, x2 = a.x + dx * scale, y2 = a.y + dy * scale; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="geo-stroke"${primitive.type !== 'line' ? ' marker-end="url(#arrow)"' : ''}/>${label(primitive.label, b.x, b.y)}`; }
      case 'circle': num(primitive.cx, 'cx'); num(primitive.cy, 'cy'); if (num(primitive.r, 'r') <= 0) throw new Error('نصف قطر غير صالح'); return `<circle cx="${primitive.cx}" cy="${primitive.cy}" r="${primitive.r}" class="geo-stroke"/>${label(primitive.label, primitive.cx + primitive.r, primitive.cy)}`;
      case 'arc': { const start = num(primitive.start, 'زاوية البداية') * Math.PI / 180, end = num(primitive.end, 'زاوية النهاية') * Math.PI / 180, r = num(primitive.r, 'نصف القطر'); if (r <= 0) throw new Error('نصف قطر غير صالح'); const sx = primitive.cx + r * Math.cos(start), sy = primitive.cy + r * Math.sin(start), ex = primitive.cx + r * Math.cos(end), ey = primitive.cy + r * Math.sin(end); return `<path d="M ${sx} ${sy} A ${r} ${r} 0 ${Math.abs(primitive.end - primitive.start) > 180 ? 1 : 0} 1 ${ex} ${ey}" class="geo-stroke"/>${label(primitive.label, primitive.cx, primitive.cy)}`; }
      case 'polygon': case 'triangle': { if ((primitive.type === 'triangle' && primitive.points.length !== 3) || primitive.points.length < 3) throw new Error('مضلع غير صالح'); const values = primitive.points.map((id) => { const p = at(id); return `${p.x},${p.y}`; }).join(' '); return `<polygon points="${values}" class="geo-stroke"/>${label(primitive.label, at(primitive.points[0]!).x, at(primitive.points[0]!).y)}`; }
      case 'angle': { const v = at(primitive.vertex), a = at(primitive.from), b = at(primitive.to); const midX = v.x + ((a.x - v.x) + (b.x - v.x)) / 8, midY = v.y + ((a.y - v.y) + (b.y - v.y)) / 8; return `<path d="M ${v.x + (a.x - v.x) / 5} ${v.y + (a.y - v.y) / 5} Q ${midX} ${midY} ${v.x + (b.x - v.x) / 5} ${v.y + (b.y - v.y) / 5}" class="geo-mark"/>${label(primitive.label, midX, midY)}`; }
      case 'dimension': { const a = at(primitive.from), b = at(primitive.to); return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="geo-dimension"/>${label(primitive.label, (a.x + b.x) / 2, (a.y + b.y) / 2)}`; }
      case 'axis': { num(primitive.x, 'محور x'); num(primitive.y, 'محور y'); if (num(primitive.length, 'طول المحور') <= 0) throw new Error('طول محور غير صالح'); return `<path d="M ${primitive.x} ${primitive.y} H ${primitive.x + primitive.length} M ${primitive.x} ${primitive.y} V ${primitive.y - primitive.length}" class="geo-axis" marker-end="url(#arrow)"/>${label(primitive.label, primitive.x + primitive.length - 8, primitive.y - 6)}`; }
      case 'coordinates': return `<text x="${num(primitive.x, 'x')}" y="${num(primitive.y, 'y')}" class="geo-coordinate">${escape(primitive.label ?? `(${primitive.x}, ${primitive.y})`)}</text>`;
      case 'annotation': return `<text x="${num(primitive.x, 'x')}" y="${num(primitive.y, 'y')}" class="geo-label">${escape(primitive.text)}</text>`;
    }
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z"/></marker><style>.geo-stroke{fill:none;stroke:#0f172a;stroke-width:2}.geo-point{fill:#0f766e}.geo-label,.geo-coordinate{font-family:Arial,sans-serif;font-size:13px;direction:rtl;unicode-bidi:isolate}.geo-mark,.geo-dimension,.geo-axis{fill:none;stroke:#0f766e;stroke-width:1.5}</style></defs>${body}</svg>`;
}
