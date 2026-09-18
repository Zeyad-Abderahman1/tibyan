import type { PermissionCode } from '@tibyan/contracts';

export interface UiPermissionItem {
  code: PermissionCode;
  label: string;
  description: string;
}

export interface UiPermissionCategory {
  category: string;
  items: UiPermissionItem[];
}

export const UI_PERMISSION_CATEGORIES: UiPermissionCategory[] = [
  {
    category: 'شؤون الطلاب',
    items: [
      {
        code: 'STUDENTS_READ',
        label: 'عرض بيانات الطلاب',
        description: 'الاطلاع على قوائم الطلاب وملفاتهم وبيانات أولياء الأمور.',
      },
      {
        code: 'STUDENTS_WRITE',
        label: 'إدارة وتعديل بيانات الطلاب',
        description: 'إضافة طلاب جدد وتعديل بياناتهم وتحديث الصور والملاحظات.',
      },
    ],
  },
  {
    category: 'المجموعات والاشتراكات',
    items: [
      {
        code: 'GROUPS_READ',
        label: 'عرض المجموعات والمواعيد',
        description: 'الاطلاع على المجموعات الدراسية وقوائم الطلاب المسجلين.',
      },
      {
        code: 'GROUPS_WRITE',
        label: 'إدارة المجموعات والاشتراكات',
        description: 'إنشاء مجموعات جديدة وتعديل مواعيدها وإلحاق الطلاب وإنهاء اشتراكاتهم.',
      },
    ],
  },
  {
    category: 'الحصص والجدولة',
    items: [
      {
        code: 'SESSIONS_MANAGE',
        label: 'إدارة وجدولة الحصص',
        description: 'توليد الحصص الدورية وإلغاء الحصص وإعادة جدولتها.',
      },
      {
        code: 'ATTENDANCE_WRITE',
        label: 'تسجيل الحضور والغياب',
        description: 'رصد حضور وغياب الطلاب يدوياً أو عبر مسح الباركود.',
      },
    ],
  },
  {
    category: 'المالية والتقارير',
    items: [
      {
        code: 'PAYMENTS_READ',
        label: 'عرض السجلات المالية',
        description: 'الاطلاع على تقارير الاشتراكات الشهرية ودفعات الحصص.',
      },
      {
        code: 'PAYMENTS_WRITE',
        label: 'تسجيل المدفوعات والتحصيل',
        description: 'تحصيل الاشتراكات وإصدار إيصالات الدفع النقدية.',
      },
      {
        code: 'REPORTS_READ',
        label: 'عرض التقارير التحليلية',
        description: 'الاطلاع على كشوفات الحضور والأداء والتقارير العامة.',
      },
    ],
  },
  {
    category: 'إدارة النظام والنسخ الاحتياطي',
    items: [
      {
        code: 'SETTINGS_WRITE',
        label: 'تعديل إعدادات النظام',
        description: 'تعديل الإعدادات العامة وإضافة وتبديل الأعوام الدراسية.',
      },
      {
        code: 'USERS_MANAGE',
        label: 'إدارة حسابات المساعدين',
        description: 'إنشاء وتعديل حسابات المساعدين وتعيين صلاحياتهم.',
      },
      {
        code: 'BACKUP_MANAGE',
        label: 'إدارة النسخ الاحتياطي',
        description: 'إنشاء نسخ احتياطية يدوية وتفقد سلامة سجلات الحفظ.',
      },
    ],
  },
];
