import { type PermissionCode, type UserRole } from '@tibyan/contracts';
import { type SystemDrizzle, getSystemDatabase, permissions } from '@tibyan/db';

export interface PermissionDefinition {
  code: PermissionCode;
  nameAr: string;
  descriptionAr: string;
  category: string;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  {
    code: 'STUDENTS_READ',
    nameAr: 'عرض بيانات الطلاب',
    descriptionAr: 'السماح بالاطلاع على قوائم وملفات الطلاب وبيانات التواصل',
    category: 'الطلاب',
  },
  {
    code: 'STUDENTS_WRITE',
    nameAr: 'إدارة وتعديل بيانات الطلاب',
    descriptionAr: 'السماح بإضافة وتعديل بيانات الطلاب وملاحظاتهم',
    category: 'الطلاب',
  },
  {
    code: 'GROUPS_READ',
    nameAr: 'عرض المجموعات والمواعيد',
    descriptionAr: 'السماح بالاطلاع على المجموعات وقوائم الملتحقين وجداول الحصص',
    category: 'المجموعات',
  },
  {
    code: 'GROUPS_WRITE',
    nameAr: 'إدارة المجموعات والاشتراكات',
    descriptionAr: 'السماح بإنشاء المجموعات وتعديلها وإلحاق الطلاب وإنهاء اشتراكاتهم',
    category: 'المجموعات',
  },
  {
    code: 'SESSIONS_MANAGE',
    nameAr: 'إدارة وجدولة الحصص',
    descriptionAr: 'السماح بتوليد الحصص وتعديل مواعيدها وإلغائها وإعادة جدولتها',
    category: 'الحصص',
  },
  {
    code: 'ATTENDANCE_WRITE',
    nameAr: 'تسجيل الحضور والغياب',
    descriptionAr: 'السماح برصد حضور الطلاب عبر مسح الباركود أو التسجيل اليدوي',
    category: 'الحضور',
  },
  {
    code: 'PAYMENTS_READ',
    nameAr: 'عرض السجلات المالية',
    descriptionAr: 'السماح بالاطلاع على سجلات المصاريف الشهرية ودفعات الحصص',
    category: 'المالية',
  },
  {
    code: 'PAYMENTS_WRITE',
    nameAr: 'تسجيل المدفوعات والتحصيل',
    descriptionAr: 'السماح بتحصيل الاشتراكات وإصدار إيصالات الدفع وتعديل مبالغ الاستثناءات',
    category: 'المالية',
  },
  {
    code: 'REPORTS_READ',
    nameAr: 'عرض التقارير والإحصاءات',
    descriptionAr: 'السماح بالاطلاع على كشوفات الحضور والأداء والتقارير التحليلية',
    category: 'التقارير',
  },
  {
    code: 'SETTINGS_WRITE',
    nameAr: 'تعديل إعدادات النظام',
    descriptionAr: 'السماح بتعديل الإعدادات العامة للنظام والمظهر وتفضيلات الطباعة',
    category: 'الإعدادات',
  },
  {
    code: 'USERS_MANAGE',
    nameAr: 'إدارة حسابات المساعدين',
    descriptionAr: 'السماح بإنشاء حسابات المساعدين وتعيين صلاحياتهم وتعيين حالاتهم',
    category: 'الحسابات',
  },
  {
    code: 'BACKUP_MANAGE',
    nameAr: 'إدارة النسخ الاحتياطي',
    descriptionAr: 'السماح بإنشاء نسخ احتياطية واستعادتها وتعيين مسارات الحفظ',
    category: 'النسخ الاحتياطي',
  },
];

export const ALL_PERMISSION_CODES: PermissionCode[] = PERMISSION_CATALOG.map((p) => p.code);

/**
 * Idempotently seeds the permission catalog into the system database.
 */
export function seedPermissions(db?: SystemDrizzle): void {
  const client = db ?? getSystemDatabase().db;
  client
    .insert(permissions)
    .values(PERMISSION_CATALOG)
    .onConflictDoNothing()
    .run();
}

/**
 * Evaluates whether a user has a specific permission.
 * - OWNER always has full permissions.
 * - ASSISTANT has permission only if explicitly present in granted permissions.
 */
export function hasPermission(
  role: UserRole,
  userPermissions: PermissionCode[],
  requiredPermission: PermissionCode
): boolean {
  if (role === 'OWNER') {
    return true;
  }
  if (role === 'ASSISTANT') {
    return userPermissions.includes(requiredPermission);
  }
  return false;
}

/**
 * Asserts that a user has a specific permission; throws if not.
 */
export function requirePermission(
  role: UserRole,
  userPermissions: PermissionCode[],
  requiredPermission: PermissionCode
): void {
  if (!hasPermission(role, userPermissions, requiredPermission)) {
    const error = new Error(`PERMISSION_DENIED: Required permission '${requiredPermission}'`);
    (error as any).code = 'PERMISSION_DENIED';
    throw error;
  }
}
