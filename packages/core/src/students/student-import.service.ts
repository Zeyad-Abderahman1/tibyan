import crypto from 'node:crypto';
import { inflateRawSync, inflateSync } from 'node:zlib';
import {
  type GradeLevel,
  type EducationSystem,
  type LanguageTrack,
  type ParsedStudentRow,
  type StudentImportPreview,
  type ExecuteStudentImportInput,
  type StudentImportResult,
  EGYPTIAN_PHONE_REGEX,
  normalizeEgyptianPhone,
} from '@tibyan/contracts';
import {
  type AcademicDrizzle,
  StudentRepository,
  AcademicAuditRepository,
} from '@tibyan/db';
import { type AuthenticatedUser } from './student.service.js';
import { requirePermission } from '../auth/permissions.js';

/**
 * Normalizes Arabic text for flexible matching:
 * - strips diacritics (harakat)
 * - normalizes alef variants
 * - normalizes yaa / alif maqsura
 * - normalizes taa marbuta
 */
export function normalizeArabicText(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();
}

/**
 * Parses raw CSV into rows of string cells.
 * Auto-detects delimiters (comma, semicolon, tab) and handles quotes/newlines.
 */
export function parseCsv(buffer: Buffer): string[][] {
  let content = buffer.toString('utf8');
  // Strip UTF-8 BOM if present
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  // Detect delimiter from first non-empty line
  const firstLine = content.split(/\r?\n/).find((l) => l.trim().length > 0) ?? '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
  else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i]!;
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Pure zero-dependency parser for standard OpenXML XLSX files using Node's zlib.
 * Extracts XML sheet data and shared strings to return rows of string values.
 */
export interface XlsxParseResult {
  rows: string[][];
  sheetName: string;
  availableSheets: string[];
}

/**
 * Pure zero-dependency parser for standard OpenXML XLSX files using Node's zlib.
 * Supports arbitrary XML namespace prefixes (e.g. <x:row>, <x:c>, <x:v>),
 * shared strings, inline strings, cached formula strings, Arabic sheet names,
 * and multi-sheet discovery.
 */
export function parseXlsx(buffer: Buffer, requestedSheetName?: string): XlsxParseResult {
  if (!buffer || buffer.length === 0) {
    throw new Error('الملف فارغ بحجم 0 بايت');
  }

  const zipEntries = extractZipEntries(buffer);
  if (zipEntries.length === 0) {
    throw new Error('فشل قراءة ملف Excel (تنسيق ZIP/OpenXML غير صالح أو الملف تالف)');
  }

  // 1. Parse shared strings if present
  const sharedStrings: string[] = [];
  const sharedStringsEntry = zipEntries.find(
    (e) => e.path.toLowerCase() === 'xl/sharedstrings.xml'
  );
  if (sharedStringsEntry) {
    const xml = sharedStringsEntry.data.toString('utf8');
    // Extract <si> or <x:si> entries
    const siRegex = /<(?:\w+:)?si\b[\s\S]*?<\/(?:\w+:)?si>/gi;
    let match: RegExpExecArray | null;
    while ((match = siRegex.exec(xml)) !== null) {
      const siContent = match[0];
      // Collect all <t> or <x:t> inside this <si>
      const tRegex = /<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/gi;
      const tPieces: string[] = [];
      let tMatch: RegExpExecArray | null;
      while ((tMatch = tRegex.exec(siContent)) !== null) {
        tPieces.push(decodeXmlEntities(tMatch[1] ?? ''));
      }
      sharedStrings.push(tPieces.join(''));
    }
  }

  // Helper function to parse rows from a single worksheet XML string
  function parseSheetXml(sheetXml: string): string[][] {
    const rows: string[][] = [];
    // Parse <row ...> ... </row> with optional XML namespace prefix like <x:row>
    const rowRegex = /<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/gi;
    let rowMatch: RegExpExecArray | null;

    while ((rowMatch = rowRegex.exec(sheetXml)) !== null) {
      const rowContent = rowMatch[1]!;
      const cells: { colIndex: number; value: string }[] = [];

      // Parse <c ...> ... </c> with optional XML namespace prefix like <x:c>
      const cellRegex = /<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/gi;
      let cellMatch: RegExpExecArray | null;

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const attrs = cellMatch[1] ?? '';
        const cellBody = cellMatch[2] ?? '';

        const rAttr = attrs.match(/\br="([A-Z]+)\d+"/)?.[1] ?? '';
        const tAttr = attrs.match(/\bt="([a-z]+)"/)?.[1] ?? '';
        const colIndex = rAttr ? columnLetterToIndex(rAttr) : cells.length;

        let cellVal = '';
        const vMatch = cellBody.match(/<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/i);
        const tMatch = cellBody.match(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/i);

        if (tAttr === 's' && vMatch) {
          const sIdx = parseInt(vMatch[1]!, 10);
          cellVal = sharedStrings[sIdx] ?? '';
        } else if (tAttr === 'inlineStr' || tMatch) {
          cellVal = decodeXmlEntities(tMatch ? tMatch[1] ?? '' : '').trim();
        } else if (tAttr === 'str' && vMatch) {
          cellVal = decodeXmlEntities(vMatch[1] ?? '').trim();
        } else if (tAttr === 'b' && vMatch) {
          cellVal = vMatch[1] === '1' ? 'نعم' : 'لا';
        } else if (vMatch) {
          cellVal = decodeXmlEntities(vMatch[1] ?? '').trim();
        }

        cells.push({ colIndex, value: cellVal });
      }

      if (cells.length > 0) {
        const maxCol = Math.max(...cells.map((c) => c.colIndex));
        const rowArr: string[] = new Array(maxCol + 1).fill('');
        for (const c of cells) {
          rowArr[c.colIndex] = c.value.trim();
        }
        // Only push row if it contains at least one non-empty cell (ignoring formatting-only empty rows)
        if (rowArr.some((c) => c.length > 0)) {
          rows.push(rowArr);
        }
      }
    }

    return rows;
  }

  // 2. Discover sheets from xl/workbook.xml & xl/_rels/workbook.xml.rels
  const workbookEntry = zipEntries.find((e) => e.path.toLowerCase() === 'xl/workbook.xml');
  const relsEntry = zipEntries.find((e) => e.path.toLowerCase() === 'xl/_rels/workbook.xml.rels');

  const relMap: Record<string, string> = {};
  if (relsEntry) {
    const relsXml = relsEntry.data.toString('utf8');
    const relRegex = /<Relationship\b([^>]*)\/?>/gi;
    let rm: RegExpExecArray | null;
    while ((rm = relRegex.exec(relsXml)) !== null) {
      const attrs = rm[1] ?? '';
      const id = attrs.match(/\bId="([^"]+)"/)?.[1];
      const target = attrs.match(/\bTarget="([^"]+)"/)?.[1];
      if (id && target) {
        const normTarget = target.replace(/^\/?xl\//, '').replace(/^\//, '');
        relMap[id] = `xl/${normTarget}`;
      }
    }
  }

  interface SheetCandidate {
    name: string;
    path: string;
  }
  const sheetCandidates: SheetCandidate[] = [];

  if (workbookEntry) {
    const workbookXml = workbookEntry.data.toString('utf8');
    const sheetRegex = /<(?:\w+:)?sheet\b([^>]*)\/?>/gi;
    let sm: RegExpExecArray | null;
    while ((sm = sheetRegex.exec(workbookXml)) !== null) {
      const attrs = sm[1] ?? '';
      const name = attrs.match(/\bname="([^"]+)"/)?.[1] ?? '';
      const rId = attrs.match(/\br:id="([^"]+)"/)?.[1] ?? attrs.match(/\bid="([^"]+)"/)?.[1] ?? '';
      const resolvedPath = relMap[rId] ?? `xl/worksheets/sheet${sheetCandidates.length + 1}.xml`;
      sheetCandidates.push({ name, path: resolvedPath });
    }
  }

  // Fallback: If no sheets found in workbook.xml, search all worksheet entries
  if (sheetCandidates.length === 0) {
    for (const entry of zipEntries) {
      if (/^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.path)) {
        sheetCandidates.push({ name: `ورقة ${sheetCandidates.length + 1}`, path: entry.path });
      }
    }
  }

  if (sheetCandidates.length === 0) {
    throw new Error('لم يتم العثور على أي ورقة عمل داخل ملف Excel');
  }

  const availableSheets = sheetCandidates.map((s) => s.name);

  // If a specific sheet was requested, try that sheet first
  if (requestedSheetName) {
    const requested = sheetCandidates.find((s) => s.name === requestedSheetName);
    if (requested) {
      const entry = zipEntries.find((e) => e.path.toLowerCase() === requested.path.toLowerCase());
      if (entry) {
        const rows = parseSheetXml(entry.data.toString('utf8'));
        return { rows, sheetName: requested.name, availableSheets };
      }
    }
  }

  // Default: Find the first non-empty worksheet
  for (const candidate of sheetCandidates) {
    const entry = zipEntries.find((e) => e.path.toLowerCase() === candidate.path.toLowerCase());
    if (entry) {
      const rows = parseSheetXml(entry.data.toString('utf8'));
      if (rows.length > 0) {
        return { rows, sheetName: candidate.name, availableSheets };
      }
    }
  }

  // If all worksheets are empty:
  throw new Error('الملف لا يحتوي على صفوف بيانات داخل أي ورقة عمل');
}

/**
 * Extracts readable table rows from PDF buffer.
 */
export function parsePdfTable(buffer: Buffer): string[][] {
  const latin = buffer.toString('latin1');
  const textStreams: string[] = [];

  for (const stream of latin.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let bytes = Buffer.from(stream[1]!, 'latin1');
    const dict = latin.slice(Math.max(0, stream.index - 300), stream.index);
    if (/\/FlateDecode\b/.test(dict)) {
      try {
        bytes = inflateSync(bytes, { maxOutputLength: 4 * 1024 * 1024 });
      } catch {
        continue;
      }
    }
    const content = bytes.toString('utf8');
    const lines: string[] = [];
    for (const textBlock of content.matchAll(/BT([\s\S]*?)ET/g)) {
      for (const literal of textBlock[1]!.matchAll(/\(((?:\\.|[^\\)])*)\)/g)) {
        const val = literal[1]!.replace(/\\([nrtbf()\\])/g, (_m, c: string) => c).trim();
        if (val) lines.push(val);
      }
    }
    if (lines.length > 0) {
      textStreams.push(lines.join(' '));
    }
  }

  if (textStreams.length === 0) {
    throw new Error('ملف PDF لا يحتوي على نصوص أو جداول قابلة للقراءة آلياً');
  }

  // Parse extracted lines into rows by splitting on common row delimiters
  const fullText = textStreams.join('\n');
  const rawLines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const rows: string[][] = [];
  for (const line of rawLines) {
    // Split by tabs or 2+ spaces
    const parts = line.split(/\t+|\s{2,}/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      rows.push(parts);
    }
  }

  return rows;
}

// ─── Minimal In-Memory ZIP Reader ──────────────────────────────────────────

interface ZipEntry {
  path: string;
  data: Buffer;
}

function extractZipEntries(buf: Buffer): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset + 30 <= buf.length) {
    // Look for local file header signature 0x04034b50 (PK\x03\x04)
    if (buf.readUInt32LE(offset) !== 0x04034b50) {
      // Advance to next byte or stop
      offset++;
      continue;
    }

    const compression = buf.readUInt16LE(offset + 8);
    const compressedSize = buf.readUInt32LE(offset + 18);
    // uncompressedSize at offset + 22
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);

    const nameStart = offset + 30;
    const name = buf.toString('utf8', nameStart, nameStart + nameLen);
    const dataStart = nameStart + nameLen + extraLen;

    if (dataStart + compressedSize > buf.length) {
      break;
    }

    const rawData = buf.subarray(dataStart, dataStart + compressedSize);
    let uncompressedData: Buffer;

    if (compression === 0) {
      uncompressedData = rawData;
    } else if (compression === 8) {
      try {
        uncompressedData = inflateRawSync(rawData);
      } catch {
        // Corrupt or unsupported stream; skip
        offset = dataStart + compressedSize;
        continue;
      }
    } else {
      offset = dataStart + compressedSize;
      continue;
    }

    entries.push({ path: name, data: uncompressedData });
    offset = dataStart + compressedSize;
  }

  return entries;
}

function decodeXmlEntities(val: string): string {
  return val
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function columnLetterToIndex(colStr: string): number {
  let index = 0;
  for (let i = 0; i < colStr.length; i++) {
    index = index * 26 + (colStr.charCodeAt(i) - 64);
  }
  return index - 1;
}

// ─── Semantic Column Mapping & Value Resolution ─────────────────────────────

interface ColumnMapping {
  nameIndex: number;
  gradeIndex: number;
  systemIndex: number;
  trackIndex: number;
  phoneIndex: number;
  notesIndex: number;
}

export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    nameIndex: -1,
    gradeIndex: -1,
    systemIndex: -1,
    trackIndex: -1,
    phoneIndex: -1,
    notesIndex: -1,
  };

  headers.forEach((header, idx) => {
    const norm = normalizeArabicText(header);

    // Full name
    if (
      mapping.nameIndex === -1 &&
      (norm.includes('اسم') || norm.includes('طالب') || norm.includes('student') || norm.includes('name'))
    ) {
      mapping.nameIndex = idx;
    }
    // Grade level
    else if (
      mapping.gradeIndex === -1 &&
      (norm.includes('صف') || norm.includes('مرحله') || norm.includes('grade') || norm.includes('class') || norm.includes('level'))
    ) {
      mapping.gradeIndex = idx;
    }
    // Education System
    else if (
      mapping.systemIndex === -1 &&
      (norm.includes('نظام') || norm.includes('تعليم') || norm.includes('system'))
    ) {
      mapping.systemIndex = idx;
    }
    // Language Track
    else if (
      mapping.trackIndex === -1 &&
      (norm.includes('مسار') || norm.includes('لغه') || norm.includes('track') || norm.includes('language'))
    ) {
      mapping.trackIndex = idx;
    }
    // Guardian Phone
    else if (
      mapping.phoneIndex === -1 &&
      (norm.includes('هاتف') || norm.includes('موبايل') || norm.includes('تليفون') || norm.includes('ولي') || norm.includes('phone') || norm.includes('mobile'))
    ) {
      mapping.phoneIndex = idx;
    }
    // Notes
    else if (
      mapping.notesIndex === -1 &&
      (norm.includes('ملاحظ') || norm.includes('note') || norm.includes('comment'))
    ) {
      mapping.notesIndex = idx;
    }
  });

  return mapping;
}

export function resolveGradeLevel(raw: string): GradeLevel | null {
  const upper = raw.trim().toUpperCase();
  if (['PREP_1', 'PREP_2', 'PREP_3', 'SEC_1', 'SEC_2', 'SEC_3'].includes(upper)) {
    return upper as GradeLevel;
  }

  const norm = normalizeArabicText(raw);
  const normNoAl = norm.replace(/(^|\s)ال/g, '$1');

  // Prep 1
  if (
    normNoAl.includes('اول اعدادي') ||
    normNoAl.includes('اولي اعدادي') ||
    normNoAl.includes('1 اعدادي') ||
    normNoAl.includes('1ع') ||
    normNoAl.includes('prep 1') ||
    normNoAl.includes('prep_1') ||
    normNoAl.includes('prep1') ||
    normNoAl.includes('1 prep')
  ) {
    return 'PREP_1';
  }
  // Prep 2
  if (
    normNoAl.includes('ثاني اعدادي') ||
    normNoAl.includes('تاني اعدادي') ||
    normNoAl.includes('ثانيه اعدادي') ||
    normNoAl.includes('تانيه اعدادي') ||
    normNoAl.includes('2 اعدادي') ||
    normNoAl.includes('2ع') ||
    normNoAl.includes('prep 2') ||
    normNoAl.includes('prep_2') ||
    normNoAl.includes('prep2') ||
    normNoAl.includes('2 prep')
  ) {
    return 'PREP_2';
  }
  // Prep 3
  if (
    normNoAl.includes('ثالث اعدادي') ||
    normNoAl.includes('تالت اعدادي') ||
    normNoAl.includes('ثالثه اعدادي') ||
    normNoAl.includes('تالته اعدادي') ||
    normNoAl.includes('3 اعدادي') ||
    normNoAl.includes('3ع') ||
    normNoAl.includes('prep 3') ||
    normNoAl.includes('prep_3') ||
    normNoAl.includes('prep3') ||
    normNoAl.includes('3 prep')
  ) {
    return 'PREP_3';
  }
  // Sec 1
  if (
    normNoAl.includes('اول ثانوي') ||
    normNoAl.includes('اولي ثانوي') ||
    normNoAl.includes('1 ثانوي') ||
    normNoAl.includes('1ث') ||
    normNoAl.includes('sec 1') ||
    normNoAl.includes('sec_1') ||
    normNoAl.includes('sec1') ||
    normNoAl.includes('1 sec')
  ) {
    return 'SEC_1';
  }
  // Sec 2
  if (
    normNoAl.includes('ثاني ثانوي') ||
    normNoAl.includes('تاني ثانوي') ||
    normNoAl.includes('ثانيه ثانوي') ||
    normNoAl.includes('تانيه ثانوي') ||
    normNoAl.includes('2 ثانوي') ||
    normNoAl.includes('2ث') ||
    normNoAl.includes('sec 2') ||
    normNoAl.includes('sec_2') ||
    normNoAl.includes('sec2') ||
    normNoAl.includes('2 sec')
  ) {
    return 'SEC_2';
  }
  // Sec 3
  if (
    normNoAl.includes('ثالث ثانوي') ||
    normNoAl.includes('تالت ثانوي') ||
    normNoAl.includes('ثالثه ثانوي') ||
    normNoAl.includes('تالته ثانوي') ||
    normNoAl.includes('3 ثانوي') ||
    normNoAl.includes('3ث') ||
    normNoAl.includes('sec 3') ||
    normNoAl.includes('sec_3') ||
    normNoAl.includes('sec3') ||
    normNoAl.includes('3 sec')
  ) {
    return 'SEC_3';
  }

  return null;
}

export function resolveEducationSystem(raw?: string): EducationSystem {
  if (!raw) return 'GENERAL';
  const norm = normalizeArabicText(raw);
  if (norm.includes('بكالوريا') || norm.includes('baccalaureate') || norm.includes('ib')) {
    return 'EGYPTIAN_BACCALAUREATE';
  }
  return 'GENERAL';
}

export function resolveLanguageTrack(raw?: string): LanguageTrack {
  if (!raw) return 'ARABIC';
  const norm = normalizeArabicText(raw);
  if (
    norm.includes('لغات') ||
    norm.includes('انجليزي') ||
    norm.includes('english') ||
    norm.includes('lang')
  ) {
    return 'LANG_ENGLISH';
  }
  return 'ARABIC';
}

// ─── StudentImportService ───────────────────────────────────────────────────

export class StudentImportService {
  private readonly studentRepo: StudentRepository;

  constructor(private readonly academicDb: AcademicDrizzle) {
    this.studentRepo = new StudentRepository(academicDb);
  }

  /**
   * Parses file buffer (.xlsx, .csv, .pdf), validates every row, performs duplicate detection,
   * and returns an interactive Preview payload.
   */
  async parseAndPreview(
    fileBuffer: Buffer,
    fileName: string,
    defaultGradeLevelOrOptions?: GradeLevel | { defaultGradeLevel?: GradeLevel; sheetName?: string } | string,
    requestedSheetName?: string
  ): Promise<StudentImportPreview> {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('الملف المرفق فارغ بحجم 0 بايت');
    }

    let defaultGradeLevel: GradeLevel | undefined;
    let targetSheetName = requestedSheetName;

    if (defaultGradeLevelOrOptions) {
      if (typeof defaultGradeLevelOrOptions === 'object') {
        defaultGradeLevel = defaultGradeLevelOrOptions.defaultGradeLevel;
        if (!targetSheetName) {
          targetSheetName = defaultGradeLevelOrOptions.sheetName;
        }
      } else if (typeof defaultGradeLevelOrOptions === 'string') {
        const isGrade = ['PREP_1', 'PREP_2', 'PREP_3', 'SEC_1', 'SEC_2', 'SEC_3'].includes(
          defaultGradeLevelOrOptions
        );
        if (isGrade) {
          defaultGradeLevel = defaultGradeLevelOrOptions as GradeLevel;
        } else if (!targetSheetName) {
          targetSheetName = defaultGradeLevelOrOptions;
        }
      }
    }

    const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'));
    let rawRows: string[][];
    let sheetName: string | undefined;
    let availableSheets: string[] | undefined;

    if (ext === '.xlsx' || ext === '.xls') {
      const parsedXlsx = parseXlsx(fileBuffer, targetSheetName);
      rawRows = parsedXlsx.rows;
      sheetName = parsedXlsx.sheetName;
      availableSheets = parsedXlsx.availableSheets;
    } else if (ext === '.csv' || ext === '.txt') {
      rawRows = parseCsv(fileBuffer);
    } else if (ext === '.pdf') {
      rawRows = parsePdfTable(fileBuffer);
    } else {
      throw new Error(`صيغة الملف غير مدعومة (${ext}). يرجى استخدام .xlsx أو .csv أو .pdf`);
    }

    if (rawRows.length === 0) {
      throw new Error('ورقة العمل لا تحتوي على بيانات');
    }

    // Determine if first row is header
    const firstRow = rawRows[0]!;
    const mapping = detectColumnMapping(firstRow);
    const hasHeader =
      mapping.nameIndex !== -1 || mapping.phoneIndex !== -1 || mapping.gradeIndex !== -1;

    const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
    const effectiveMapping = hasHeader
      ? mapping
      : {
          nameIndex: 0,
          gradeIndex: 1 < firstRow.length ? 1 : -1,
          systemIndex: 2 < firstRow.length ? 2 : -1,
          trackIndex: 3 < firstRow.length ? 3 : -1,
          phoneIndex: 4 < firstRow.length ? 4 : -1,
          notesIndex: 5 < firstRow.length ? 5 : -1,
        };

    // Load existing students to detect duplicates
    const existingStudents = this.studentRepo.list();
    const existingKeySet = new Set(
      existingStudents.map(
        (s) => `${normalizeArabicText(s.fullName)}:${s.guardianPhone}`
      )
    );

    const parsedRows: ParsedStudentRow[] = [];
    const seenInFileKeys = new Set<string>();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]!;
      const rowIndex = i + (hasHeader ? 2 : 1);

      const rawName =
        effectiveMapping.nameIndex >= 0 ? row[effectiveMapping.nameIndex] ?? '' : '';
      const rawGrade =
        effectiveMapping.gradeIndex >= 0 ? row[effectiveMapping.gradeIndex] ?? '' : '';
      const rawSystem =
        effectiveMapping.systemIndex >= 0 ? row[effectiveMapping.systemIndex] ?? '' : '';
      const rawTrack =
        effectiveMapping.trackIndex >= 0 ? row[effectiveMapping.trackIndex] ?? '' : '';
      const rawPhone =
        effectiveMapping.phoneIndex >= 0 ? row[effectiveMapping.phoneIndex] ?? '' : '';
      const rawNotes =
        effectiveMapping.notesIndex >= 0 ? row[effectiveMapping.notesIndex] ?? '' : '';

      const fullName = rawName.trim();
      const gradeLevel = rawGrade ? resolveGradeLevel(rawGrade) : defaultGradeLevel;
      const educationSystem = resolveEducationSystem(rawSystem);
      const languageTrack = resolveLanguageTrack(rawTrack);

      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate name
      if (!fullName) {
        errors.push('اسم الطالب فارغ');
      }

      // Validate grade
      if (!gradeLevel) {
        errors.push(
          rawGrade ? `الصف الدراسي غير معروف: "${rawGrade}"` : 'الصف الدراسي غير محدد'
        );
      }

      // Validate phone
      let normalizedPhone: string | undefined;
      if (!rawPhone) {
        errors.push('رقم هاتف ولي الأمر مطلوب');
      } else {
        const cleaned = rawPhone.replace(/[\s\-\+]/g, '');
        // Egyptian phone test
        if (EGYPTIAN_PHONE_REGEX.test(rawPhone) || EGYPTIAN_PHONE_REGEX.test(cleaned)) {
          normalizedPhone = normalizeEgyptianPhone(cleaned);
        } else {
          errors.push(`رقم هاتف ولي الأمر غير صالح (${rawPhone})؛ يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015 ويتكون من 11 رقماً`);
        }
      }

      // Duplicate check
      let isDuplicate = false;
      if (fullName && normalizedPhone) {
        const key = `${normalizeArabicText(fullName)}:${normalizedPhone}`;
        if (existingKeySet.has(key)) {
          isDuplicate = true;
          warnings.push('طالب مكرر (مسجل بالفعل بنفس الاسم ورقم ولي الأمر)');
        } else if (seenInFileKeys.has(key)) {
          isDuplicate = true;
          warnings.push('طالب مكرر أكثر من مرة في نفس الملف');
        }
        seenInFileKeys.add(key);
      }

      // Determine status
      let status: ParsedStudentRow['status'] = 'READY';
      let statusMessageAr = 'جاهز للإضافة';

      if (errors.some((e) => e.includes('هاتف'))) {
        status = 'INVALID_PHONE';
        statusMessageAr = 'رقم هاتف غير صالح';
      } else if (errors.some((e) => e.includes('فارغ') || e.includes('مطلوب'))) {
        status = 'MISSING_DATA';
        statusMessageAr = 'بيانات ناقصة';
      } else if (errors.some((e) => e.includes('غير معروف'))) {
        status = 'UNKNOWN_VALUE';
        statusMessageAr = 'قيمة غير معروفة';
      } else if (isDuplicate) {
        status = 'DUPLICATE';
        statusMessageAr = 'مكرر';
      } else if (warnings.length > 0) {
        status = 'NEEDS_REVIEW';
        statusMessageAr = 'يحتاج مراجعة';
      }

      parsedRows.push({
        rowIndex,
        fullName,
        educationSystem,
        gradeLevel: gradeLevel ?? undefined,
        languageTrack,
        guardianPhone: normalizedPhone ?? rawPhone,
        notes: rawNotes,
        rawValues: {
          name: rawName,
          grade: rawGrade,
          system: rawSystem,
          track: rawTrack,
          phone: rawPhone,
          notes: rawNotes,
        },
        status,
        statusMessageAr,
        errors,
        warnings,
        selected: status === 'READY',
      });
    }

    const validCount = parsedRows.filter((r) => r.status === 'READY').length;
    const duplicateCount = parsedRows.filter((r) => r.status === 'DUPLICATE').length;
    const warningCount = parsedRows.filter((r) => r.status === 'NEEDS_REVIEW').length;
    const invalidCount = parsedRows.filter(
      (r) => r.status !== 'READY' && r.status !== 'DUPLICATE' && r.status !== 'NEEDS_REVIEW'
    ).length;

    return {
      fileName,
      sheetName,
      availableSheets,
      totalRows: parsedRows.length,
      validCount,
      duplicateCount,
      warningCount,
      invalidCount,
      rows: parsedRows,
    };
  }

  /**
   * Executes bulk creation of approved rows in transaction with unique student codes and audit logging.
   */
  async executeImport(
    input: ExecuteStudentImportInput,
    actor: AuthenticatedUser
  ): Promise<StudentImportResult> {
    requirePermission(actor.role, actor.permissions ?? [], 'STUDENTS_WRITE');

    const importedStudentIds: string[] = [];
    const errors: string[] = [];
    let skippedCount = 0;

    const now = new Date().toISOString();

    this.academicDb.transaction((tx) => {
      const studentRepoTx = new StudentRepository(tx as any);
      const auditRepoTx = new AcademicAuditRepository(tx as any);

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i]!;

        // Check again for duplicate before insert
        const existingKey = studentRepoTx
          .list()
          .find(
            (s) =>
              normalizeArabicText(s.fullName) === normalizeArabicText(row.fullName) &&
              s.guardianPhone === row.guardianPhone
          );

        if (existingKey) {
          skippedCount++;
          continue;
        }

        const studentId = crypto.randomUUID();
        const totalCount = studentRepoTx.list().length + 1;
        const studentCode = `TB-${totalCount.toString().padStart(4, '0')}`;
        const qrToken = crypto.randomBytes(16).toString('hex');
        const barcodeValue = studentCode;

        studentRepoTx.create({
          id: studentId,
          studentCode,
          fullName: row.fullName.trim(),
          photoPath: null,
          educationSystem: row.educationSystem,
          gradeLevel: row.gradeLevel,
          languageTrack: row.languageTrack,
          guardianPhone: row.guardianPhone,
          status: 'ACTIVE',
          qrToken,
          barcodeValue,
          createdAt: now,
          updatedAt: now,
        });

        // Insert initial note if provided
        if (row.notes && row.notes.trim()) {
          studentRepoTx.addNote({
            id: crypto.randomUUID(),
            studentId,
            authorUserId: actor.userId,
            authorNameSnapshot: actor.fullName,
            noteText: row.notes.trim(),
            tag: 'GENERAL',
            createdAt: now,
          });
        }

        // Audit entry
        auditRepoTx.insert({
          id: crypto.randomUUID(),
          actorType: 'USER',
          actorUserId: actor.userId,
          actorNameSnapshot: actor.fullName,
          action: 'IMPORT_STUDENT_BULK',
          entityType: 'STUDENT',
          entityId: studentId,
          afterJson: JSON.stringify({
            studentId,
            studentCode,
            fullName: row.fullName,
            gradeLevel: row.gradeLevel,
          }),
          createdAt: now,
        });

        importedStudentIds.push(studentId);
      }
    });

    return {
      importedCount: importedStudentIds.length,
      skippedCount,
      failedCount: errors.length,
      importedStudentIds,
      errors,
    };
  }
}
