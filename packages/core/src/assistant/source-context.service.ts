import { inflateSync } from 'node:zlib';
import type { SourceDocumentDto } from '@tibyan/contracts';

export interface SourcePage { page: number; text: string }
export interface SourceContext { document: SourceDocumentDto; pages: SourcePage[]; fileData: ManagedPdf }
export interface ManagedPdf { data: Buffer; mimeType: string }

/** Resolves managed PDFs in Core and supplies only extracted page text to AI generation. */
export class SourceContextService {
  constructor(
    private readonly getDocument: (id: string) => SourceDocumentDto,
    private readonly readManagedPdf: (id: string) => Promise<ManagedPdf | null>,
  ) {}

  async load(sourceDocumentId: string): Promise<SourceContext> {
    const document = this.getDocument(sourceDocumentId);
    const file = await this.readManagedPdf(sourceDocumentId);
    if (!file || file.mimeType !== 'application/pdf' || !file.data.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
      throw new Error('تعذر قراءة ملف المصدر المحدد');
    }
    const pages = extractPdfPages(file.data);
    if (!pages.length) throw new Error('ملف المصدر لا يحتوي على نص قابل للاستخراج؛ الملفات المصورة فقط غير مدعومة');
    if (pages.reduce((length, page) => length + page.text.length, 0) > 200_000) {
      throw new Error('ملف المصدر كبير جداً للمعالجة دفعة واحدة؛ يرجى اختيار مصدر أصغر');
    }
    return { document, pages, fileData: file };
  }
}

function decodeLiteral(value: string): string {
  return value.replace(/\\([nrtbf()\\])/g, (_match, char: string) => ({ n: '\n', r: '\r', t: '\t', b: '', f: '', '(': '(', ')': ')', '\\': '\\' })[char] ?? char);
}

function extractPdfPages(pdf: Buffer): SourcePage[] {
  const source = pdf.toString('latin1');
  const objects = new Map<number, string>();
  for (const object of source.matchAll(/(\d+)\s+\d+\s+obj\b([\s\S]*?)\bendobj\b/g)) {
    objects.set(Number(object[1]), object[2]!);
  }
  const referencedPages: SourcePage[] = [];
  const pageObjects = [...objects.values()].filter((body) => /\/Type\s*\/Page\b/.test(body));
  for (let index = 0; index < pageObjects.length; index++) {
    const body = pageObjects[index]!;
    const contents = body.match(/\/Contents\s+(\d+)\s+\d+\s+R/)?.[1];
    const contentObject = contents ? objects.get(Number(contents)) : undefined;
    const text = contentObject ? extractStreamText(contentObject) : extractStreamText(body);
    if (text) referencedPages.push({ page: index + 1, text });
  }
  if (referencedPages.length) return referencedPages;
  const pageStarts = [...source.matchAll(/\/Type\s*\/Page\b/g)].map((match) => match.index);
  const pages: SourcePage[] = [];
  for (let index = 0; index < pageStarts.length; index++) {
    const segment = source.slice(pageStarts[index], pageStarts[index + 1] ?? source.length);
    const text = extractStreamText(segment);
    if (text) pages.push({ page: index + 1, text });
  }
  return pages;
}

function extractStreamText(segment: string): string {
  const pieces: string[] = [];
  for (const stream of segment.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
      let bytes = Buffer.from(stream[1]!, 'latin1');
      const dictionary = segment.slice(Math.max(0, stream.index - 300), stream.index);
      if (/\/FlateDecode\b/.test(dictionary)) {
        try { bytes = inflateSync(bytes, { maxOutputLength: 4 * 1024 * 1024 }); } catch { continue; }
      }
      const content = bytes.toString('latin1');
      for (const textBlock of content.matchAll(/BT([\s\S]*?)ET/g)) {
        for (const literal of textBlock[1]!.matchAll(/\(((?:\\.|[^\\)])*)\)/g)) {
          const value = decodeLiteral(literal[1]!).trim();
          if (value) pieces.push(value);
        }
      }
  }
  return pieces.join(' ').trim();
}
