export interface SafeContextPayload {
  activeAcademicYearId: string | null;
  activeAcademicYearName: string | null;
  scope: string | null;
  entityId: string | null;
  entityLabel: string | null;
  timestamp: string;
}

export interface ContextBuilderDeps {
  getActiveAcademicYear: () => { id: string; name: string } | null;
  resolveEntityLabel: (scope: string, entityId: string) => Promise<string | null>;
}

export async function buildSafeContext(
  deps: ContextBuilderDeps,
  scope?: string | null,
  entityId?: string | null,
): Promise<SafeContextPayload> {
  const year = deps.getActiveAcademicYear();
  let entityLabel: string | null = null;

  if (scope && entityId) {
    entityLabel = await deps.resolveEntityLabel(scope, entityId);
  }

  return {
    activeAcademicYearId: year?.id ?? null,
    activeAcademicYearName: year?.name ?? null,
    scope: scope ?? null,
    entityId: entityId ?? null,
    entityLabel,
    timestamp: new Date().toISOString(),
  };
}

export function formatContextForPrompt(ctx: SafeContextPayload): string {
  const parts: string[] = [];
  if (ctx.activeAcademicYearName) parts.push(`السنة الدراسية النشطة: ${ctx.activeAcademicYearName}`);
  if (ctx.scope && ctx.entityId) {
    const scopeLabel = scopeLabelAr(ctx.scope);
    parts.push(`السياق الحالي: ${scopeLabel}${ctx.entityLabel ? ` — ${ctx.entityLabel}` : ''}`);
  }
  return parts.join('\n');
}

function scopeLabelAr(scope: string): string {
  const map: Record<string, string> = {
    global: 'عام',
    student: 'طالب',
    group: 'مجموعة',
    exam: 'امتحان',
    analytics: 'تحليلات',
    lesson: 'خطة درس',
    capture: 'تقديم ورقي',
  };
  return map[scope] ?? scope;
}
