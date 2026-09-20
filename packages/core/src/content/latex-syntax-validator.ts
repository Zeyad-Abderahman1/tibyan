export interface LatexValidationResult {
  valid: boolean;
  error?: string;
  errorAr?: string;
}

/**
 * List of TeX commands that can execute arbitrary operations, read/write files,
 * modify internal catcodes, or execute external URLs.
 */
const FORBIDDEN_TEX_COMMANDS = [
  '\\write',
  '\\newwrite',
  '\\openout',
  '\\openin',
  '\\closeout',
  '\\closein',
  '\\read',
  '\\input',
  '\\include',
  '\\endinput',
  '\\catcode',
  '\\csname',
  '\\endcsname',
  '\\def',
  '\\gdef',
  '\\edef',
  '\\xdef',
  '\\let',
  '\\futurelet',
  '\\immediate',
  '\\special',
  '\\escapechar',
  '\\url',
  '\\href',
  '\\loop',
  '\\repeat',
  '\\every',
  '\\outer',
];

/**
 * Validates a LaTeX expression for mathematical authoring.
 * Checks for:
 * 1. Unsafe/forbidden TeX commands.
 * 2. Balanced delimiters: braces {}, brackets [], parentheses ().
 * 3. Balanced environments: \begin{env} and \end{env}.
 *
 * Designed to provide instant, offline, deterministic feedback to educators.
 */
export function validateLatexSyntax(latex: string): LatexValidationResult {
  if (!latex || typeof latex !== 'string' || latex.trim().length === 0) {
    return {
      valid: false,
      error: 'LaTeX expression cannot be empty',
      errorAr: 'المعادلة الرياضية لا يمكن أن تكون فارغة',
    };
  }

  const trimmed = latex.trim();

  // 1. Check forbidden commands
  for (const cmd of FORBIDDEN_TEX_COMMANDS) {
    const escaped = cmd.replace(/\\/g, '\\\\');
    const regex = new RegExp(`${escaped}(?![a-zA-Z])`, 'i');
    if (regex.test(trimmed)) {
      return {
        valid: false,
        error: `Unsafe TeX command rejected: ${cmd}`,
        errorAr: `تم رفض أمر TeX غير آمن: ${cmd}`,
      };
    }
  }

  // 2. Check balanced delimiters
  const stack: { char: string; index: number }[] = [];
  let isEscaped = false;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '{' || char === '[' || char === '(') {
      stack.push({ char, index: i });
    } else if (char === '}' || char === ']' || char === ')') {
      if (stack.length === 0) {
        return {
          valid: false,
          error: `Unmatched closing delimiter '${char}' at position ${i + 1}`,
          errorAr: `قوس إغلاق غير متطابق '${char}' عند الموضع ${i + 1}`,
        };
      }
      const top = stack.pop()!;
      const matching: Record<string, string> = { '}': '{', ']': '[', ')': '(' };
      if (matching[char] !== top.char) {
        return {
          valid: false,
          error: `Mismatched delimiters: expected closing for '${top.char}' but found '${char}' at position ${i + 1}`,
          errorAr: `عدم تطابق في الأقواس: متوقع إغلاق '${top.char}' ولكن وُجد '${char}' عند الموضع ${i + 1}`,
        };
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1]!;
    return {
      valid: false,
      error: `Unclosed delimiter '${unclosed.char}' at position ${unclosed.index + 1}`,
      errorAr: `قوس غير مغلق '${unclosed.char}' عند الموضع ${unclosed.index + 1}`,
    };
  }

  // 3. Check balanced environments \begin{name} and \end{name}
  const envStack: { name: string; index: number }[] = [];
  const envRegex = /\\(begin|end)\{([a-zA-Z0-9*]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = envRegex.exec(trimmed)) !== null) {
    const action = match[1]!;
    const envName = match[2]!;
    const index = match.index;

    if (action === 'begin') {
      envStack.push({ name: envName, index });
    } else if (action === 'end') {
      if (envStack.length === 0) {
        return {
          valid: false,
          error: `Unmatched '\\end{${envName}}' at position ${index + 1}`,
          errorAr: `بيئة إغلاق غير متطابقة '\\end{${envName}}' عند الموضع ${index + 1}`,
        };
      }
      const top = envStack.pop()!;
      if (top.name !== envName) {
        return {
          valid: false,
          error: `Mismatched environment: expected '\\end{${top.name}}' but found '\\end{${envName}}' at position ${index + 1}`,
          errorAr: `عدم تطابق في البيئة الرياضية: متوقع '\\end{${top.name}}' ولكن وُجد '\\end{${envName}}'`,
        };
      }
    }
  }

  if (envStack.length > 0) {
    const unclosedEnv = envStack[envStack.length - 1]!;
    return {
      valid: false,
      error: `Unclosed environment '\\begin{${unclosedEnv.name}}' at position ${unclosedEnv.index + 1}`,
      errorAr: `بيئة رياضية غير مغلقة '\\begin{${unclosedEnv.name}}'`,
    };
  }

  return { valid: true };
}
