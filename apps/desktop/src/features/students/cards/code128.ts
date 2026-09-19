/**
 * Code 128 Pattern Table (Subset B)
 * Standard ISO/IEC 15417 linear barcode encoding.
 * 107 symbols (0 to 106).
 */
export const CODE128_PATTERNS: readonly string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213', // 0-9
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132', // 10-19
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211', // 20-29
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313', // 30-39
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331', // 40-49
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111', // 50-59
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214', // 60-69
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111', // 70-79
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', // 80-89
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', // 90-99
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112', // 100-106 (104 = Start B, 106 = Stop)
] as const;

export interface Code128EncodingResult {
  values: number[];
  checksum: number;
  pattern: string;
}

/**
 * Encodes an ASCII string (e.g. canonical studentCode 'TB-0042') into Code 128 Subset B.
 * Calculates modulo 103 checksum and appends standard Stop symbol + final termination bar.
 */
export function encodeCode128B(text: string): Code128EncodingResult {
  if (!text || typeof text !== 'string') {
    throw new Error('Code 128 encoding requires a non-empty string');
  }

  // Validate printable ASCII (space 0x20 through tilde 0x7E)
  if (!/^[\x20-\x7E]+$/.test(text)) {
    throw new Error(`Invalid text for Code 128 Subset B: "${text}". Only printable ASCII characters are supported.`);
  }

  const values: number[] = [104]; // Start Code B
  let checksumAcc = 104;

  for (let i = 0; i < text.length; i++) {
    const symbolVal = text.charCodeAt(i) - 32;
    values.push(symbolVal);
    checksumAcc += (i + 1) * symbolVal;
  }

  const checksum = checksumAcc % 103;
  values.push(checksum);
  values.push(106); // Stop Code

  let pattern = '';
  for (const v of values) {
    pattern += CODE128_PATTERNS[v];
  }
  pattern += '2'; // Final termination bar (width 2)

  return { values, checksum, pattern };
}
