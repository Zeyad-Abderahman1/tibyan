import { useState } from 'react';
import { Modal, Button, Badge, Card } from '@tibyan/design-system';
import {
  Copy,
  ExternalLink,
  Check,
  UserX,
  Clock,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { useEndOfDayFollowUp } from '../../hooks/useAttendance.js';

export interface ParentFollowUpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessionDate: string;
}

export type FollowUpStatus = 'UNCONTACTED' | 'CONTACTED' | 'UNREACHABLE';

export function ParentFollowUpDrawer({
  isOpen,
  onClose,
  sessionDate,
}: ParentFollowUpDrawerProps) {
  const { data: followUpData, isLoading, isError, error } = useEndOfDayFollowUp(sessionDate);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contactStates, setContactStates] = useState<Record<string, FollowUpStatus>>({});

  const handleCopy = async (id: string, text: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopiedId(id);
        setContactStates((prev) => ({ ...prev, [id]: 'CONTACTED' }));
        setTimeout(() => setCopiedId(null), 2500);
      }
    } catch {
      // Fallback
    }
  };

  const handleOpenWhatsApp = async (id: string, phone: string, message: string) => {
    try {
      if (typeof window !== 'undefined' && window.tibyan?.system?.openWhatsApp) {
        const res = await window.tibyan.system.openWhatsApp({ phone, message });
        if (res.success) {
          setContactStates((prev) => ({ ...prev, [id]: 'CONTACTED' }));
        }
      }
    } catch {
      // Fallback
    }
  };

  const followUps = followUpData?.followUps || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="متابعة أولياء الأمور والغياب"
      size="lg"
    >
      <div className="space-y-4" dir="rtl">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border-subtle)]">
          <p className="text-xs text-[var(--color-text-secondary)]">
            تجهيز وإرسال رسائل المتابعة عبر واتساب لأولياء أمور الطلاب الغائبين والمتأخرين ليوم{' '}
            <span className="font-mono font-bold text-[var(--color-text-primary)]" dir="ltr">
              {sessionDate}
            </span>
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="danger" size="sm">
              غائب: {followUpData?.totalAbsent ?? 0}
            </Badge>
            <Badge variant="warning" size="sm">
              متأخر: {followUpData?.totalLate ?? 0}
            </Badge>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 text-center space-y-2">
            <div className="w-6 h-6 mx-auto rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin" />
            <p className="text-xs text-[var(--color-text-muted)]">جاري تجهيز بيانات المتابعة...</p>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="p-4 text-center text-xs text-[var(--color-status-danger)] bg-[var(--color-status-danger-bg)] rounded-lg">
            <AlertCircle className="w-5 h-5 mx-auto mb-1" />
            <span>{(error as any)?.message || 'فشل استرجاع بيانات المتابعة.'}</span>
          </div>
        )}

        {/* List of Follow-up Items */}
        {!isLoading && !isError && (
          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {followUps.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--color-text-muted)]">
                لا توجد حالات غياب أو تأخر مسجلة لهذا التاريخ. جميع الطلاب منتظمون!
              </div>
            ) : (
              followUps.map((item) => {
                const itemKey = `${item.sessionId}_${item.studentId}`;
                const contactStatus = contactStates[itemKey] || 'UNCONTACTED';
                const isCopied = copiedId === itemKey;

                return (
                  <Card
                    key={itemKey}
                    variant="default"
                    className="p-3.5 space-y-2.5 border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)] transition-all"
                    data-testid={`followup-item-${item.studentId}`}
                  >
                    {/* Header: Student Name + Status Badge + Contact State */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {item.status === 'ABSENT' ? (
                          <div className="w-7 h-7 rounded-full bg-red-500/10 text-red-600 flex items-center justify-center shrink-0">
                            <UserX className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-[var(--color-text-primary)]">
                            {item.studentName}
                          </h4>
                          <span className="text-[11px] text-[var(--color-text-muted)]">
                            {item.groupName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {contactStatus === 'CONTACTED' ? (
                          <Badge variant="success" size="sm">
                            تم التواصل
                          </Badge>
                        ) : contactStatus === 'UNREACHABLE' ? (
                          <Badge variant="neutral" size="sm">
                            تعذر التواصل
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            لم يتم
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Guardian Phone */}
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]">
                      <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                      <span>هاتف ولي الأمر:</span>
                      <span className="font-mono font-semibold" dir="ltr">
                        {item.guardianPhone}
                      </span>
                    </div>

                    {/* WhatsApp Message Draft Box */}
                    <div className="p-2.5 rounded-lg bg-[var(--color-bg-surface-subtle)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] leading-relaxed font-sans">
                      {item.whatsappMessage}
                    </div>

                    {/* Actions: Copy + Open WhatsApp + Status Toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[var(--color-border-subtle)]">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setContactStates((p) => ({
                              ...p,
                              [itemKey]: contactStatus === 'CONTACTED' ? 'UNCONTACTED' : 'CONTACTED',
                            }))
                          }
                          className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] underline"
                        >
                          تغيير حالة التواصل
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopy(itemKey, item.whatsappMessage)}
                          className="text-xs py-1 px-2.5 flex items-center gap-1"
                          data-testid={`btn-copy-msg-${item.studentId}`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span>تم النسخ</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>نسخ الرسالة</span>
                            </>
                          )}
                        </Button>

                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            handleOpenWhatsApp(itemKey, item.guardianPhone, item.whatsappMessage)
                          }
                          className="text-xs py-1 px-2.5 flex items-center gap-1"
                          data-testid={`btn-open-wa-${item.studentId}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>فتح واتساب</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        <div className="flex items-center justify-end pt-2 border-t border-[var(--color-border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            data-testid="close-followup-drawer-btn"
          >
            إغلاق
          </Button>
        </div>
      </div>
    </Modal>
  );
}
