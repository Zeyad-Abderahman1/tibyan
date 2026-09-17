/**
 * Regular expression matching exactly 4 numeric digits for PINs.
 */
export const PIN_4DIGIT_REGEX = /^\d{4}$/;

/**
 * Regular expression matching Egyptian mobile numbers in both local (01X XXXXXXXX)
 * and international (+201X XXXXXXXX, 00201X XXXXXXXX) formats.
 * Valid network prefixes: 010 (Vodafone), 011 (Etisalat), 012 (Orange), 015 (WE).
 */
export const EGYPTIAN_PHONE_REGEX = /^(?:\+20|0020)?0?1[0125]\d{8}$/;

/**
 * Regular expression matching 24-hour time strings in HH:mm format.
 */
export const TIME_HHMM_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/**
 * Regular expression matching calendar dates in YYYY-MM-DD format.
 */
export const DATE_YYYYMMDD_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/**
 * Helper to normalize Egyptian mobile numbers to local 11-digit format: 01XXXXXXXXX
 */
export function normalizeEgyptianPhone(input: string): string {
  const cleaned = input.trim().replace(/[\s-]/g, '');
  const match = cleaned.match(EGYPTIAN_PHONE_REGEX);
  if (!match) {
    throw new Error(`Invalid Egyptian mobile number: ${input}`);
  }
  // Remove international prefix (+20, 0020) and ensure leading 0
  const digitsOnly = cleaned.replace(/^(?:\+20|0020)/, '');
  return digitsOnly.startsWith('0') ? digitsOnly : `0${digitsOnly}`;
}
