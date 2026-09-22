import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@tibyan/design-system';
import {
  Send,
  Bot,
  User,
  Loader2,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Undo2,
  X,
  Wrench,
  RotateCcw,
  Paperclip,
  FileSpreadsheet,
  UploadCloud,
} from 'lucide-react';
import type { AssistantAttachmentDto } from '@tibyan/contracts';
import { useAssistant } from '../../hooks/useAssistant.js';

const TOOL_LABELS: Record<string, string> = {
  list_students: 'قائمة الطلاب',
  get_student: 'تفاصيل الطالب',
  list_student_notes: 'ملاحظات الطالب',
  list_groups: 'قائمة المجموعات',
  get_group: 'تفاصيل المجموعة',
  get_group_schedule: 'جدول المجموعة',
  list_group_enrollments: 'طلاب المجموعة',
  get_today_sessions: 'حصص اليوم',
  list_sessions: 'قائمة الحصص',
  get_session: 'تفاصيل الحصة',
  get_session_attendance: 'حضور الحصة',
  get_student_attendance: 'سجل حضور الطالب',
  get_attendance_summary: 'ملخص الحضور',
  get_end_of_day_follow_up: 'متابعة نهاية اليوم',
  list_curriculum_documents: 'وثائق المنهج',
  get_curriculum_tree: 'شجرة المنهج',
  get_group_progress: 'تقدم المجموعة في المنهج',
  list_questions: 'بنك الأسئلة',
  get_question: 'تفاصيل السؤال',
  list_exams: 'قائمة الاختبارات',
  get_exam: 'تفاصيل الاختبار',
  get_exam_structure: 'هيكل الاختبار',
  list_slide_decks: 'عروض الشرائح',
  get_slide_deck: 'عرض الشرائح',
  list_capture_sessions: 'جلسات التصحيح الورقي',
  get_exam_summary: 'ملخص نتائج الاختبار',
  get_score_distribution: 'توزيع الدرجات',
  get_question_performance: 'أداء الأسئلة',
  get_skill_performance: 'أداء المهارات',
  get_student_results: 'نتائج الطلاب',
  get_student_financial_summary: 'الملخص المالي للطالب',
  get_financial_kpis: 'المؤشرات المالية العامة',
  list_payments: 'سجل المدفوعات',
  list_invoices: 'قائمة الفواتير',
  list_lesson_plans: 'خطط الدروس',
  get_today_dashboard: 'لوحة تحكم اليوم',
  get_academic_year_info: 'بيانات العام الدراسي',
  get_app_info: 'بيانات التطبيق والنظام',
};

export interface PlatformControlChatProps {
  sessionId?: string | null;
  onSessionCreated?: (sessionId: string) => void;
}

export function PlatformControlChat({ sessionId, onSessionCreated }: PlatformControlChatProps = {}) {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<AssistantAttachmentDto | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    messages,
    sending,
    error,
    currentSession,
    sendMessage,
    confirmAction,
    undoAction,
    selectSession,
    loadSessions,
  } = useAssistant();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (sessionId && sessionId !== currentSession?.id) {
      selectSession(sessionId);
    }
  }, [sessionId, currentSession?.id, selectSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleProcessFile = useCallback(async (file: File) => {
    setFileError(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowed = ['.xlsx', '.xls', '.csv', '.pdf'];
    if (!allowed.includes(ext)) {
      setFileError(`نوع الملف غير مدعوم (${ext}). يُرجى استخدام ملف بصيغة Excel (.xlsx, .xls) أو CSV (.csv) أو PDF (.pdf).`);
      return;
    }

    const MAX_SIZE = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileError('حجم الملف كبير جداً. الحد الأقصى المسموح به هو 15 ميجابايت.');
      return;
    }

    setUploadingAttachment(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = (reader.result as string).split(',')[1] || '';
          resolve(res);
        };
        reader.onerror = () => reject(new Error('فشل في قراءة الملف'));
      });
      reader.readAsDataURL(file);
      const base64 = await base64Promise;

      const uploadRes = await window.tibyan.assistant.uploadAttachment({
        fileName: file.name,
        fileContentBase64: base64,
        mimeType: file.type || undefined,
      });

      if (uploadRes.success) {
        setAttachment(uploadRes.data);
      } else {
        setFileError(uploadRes.error?.message || 'فشل في رفع المرفق');
      }
    } catch (err: any) {
      setFileError(err?.message || 'فشل في معالجة الملف');
    } finally {
      setUploadingAttachment(false);
    }
  }, []);

  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]!;
      handleProcessFile(file);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (dragCounterRef.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]!;
      handleProcessFile(file);
    }
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if ((!text && !attachment) || sending || uploadingAttachment) return;
    const currentAttachment = attachment;
    const userText = text || (currentAttachment ? `استورد الطلاب الموجودين في الملف (${currentAttachment.fileName})، اعرض لي معاينة بالبيانات والأخطاء أو التكرارات قبل الإضافة، وبعد تأكيدي أضف الطلاب الصالحين فقط.` : '');
    setInput('');
    setAttachment(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    try {
      const attachmentsToSend = currentAttachment ? [currentAttachment] : undefined;
      const resp = await sendMessage(userText, 'PLATFORM_CONTROL', undefined, sessionId || undefined, attachmentsToSend);
      const activeId = resp.messages?.[0]?.sessionId;
      if (activeId && activeId !== sessionId) {
        onSessionCreated?.(activeId);
      }
    } catch {
      // Error handled by hook
    }
  }, [input, attachment, sending, uploadingAttachment, sendMessage, sessionId, onSessionCreated]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirm = async (previewId: string, confirmed: boolean) => {
    try {
      await confirmAction(previewId, confirmed, sessionId || currentSession?.id);
    } catch {
      // Error handled by hook
    }
  };

  const handleUndo = async (receiptId: string, undoToken: string) => {
    try {
      await undoAction(receiptId, undoToken, sessionId || currentSession?.id);
    } catch {
      // Error handled by hook
    }
  };

  return (
    <div
      className="relative flex flex-col h-full bg-[var(--color-bg-base)]"
      dir="rtl"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDragging && (
        <div
          className="absolute inset-0 z-50 bg-[var(--color-bg-base)]/90 backdrop-blur-sm border-2 border-dashed border-[var(--color-brand-primary)] rounded-2xl flex flex-col items-center justify-center p-6 text-center pointer-events-none transition-all"
          data-testid="platform-chat-drop-overlay"
        >
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8 text-[var(--color-brand-primary)]" />
          </div>
          <p className="text-lg font-bold text-[var(--color-brand-primary)]">
            أفلت الملف هنا
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            ندعم ملفات Excel (.xlsx, .xls) و CSV (.csv) و PDF (.pdf) حتى 15 ميجابايت
          </p>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-brand-primary-bg)] flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-[var(--color-brand-primary)]" />
              </div>
              <p className="text-base font-medium text-[var(--color-text-primary)]">
                تِبيان — التحكم في المنصة
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-2 leading-relaxed">
                اطرح أي سؤال عن المنصة باللغة العربية. يمكنني استعراض وإدارة الطلاب، المجموعات، الحضور، الدرجات، المالية، والخطط بأمان.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            data-testid={`chat-message-${idx}`}
          >
            {msg.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-[var(--color-brand-primary-bg)] flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-[var(--color-brand-primary)]" />
              </div>
            )}

            <div className="max-w-[75%] space-y-2">
              {/* Tool Execution Pill / Result */}
              {(msg.role === 'tool-result' || msg.type === 'tool-result' || msg.type === 'tool-call') && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)]">
                  <Wrench className="w-3.5 h-3.5 text-[var(--color-brand-primary)]" />
                  <span>
                    استعلام المنصة: {msg.toolName ? (TOOL_LABELS[msg.toolName] || msg.toolName) : 'تم بنجاح'}
                  </span>
                </div>
              )}

              {/* Confirmation / Preview Card */}
              {msg.type === 'preview' && (msg.previewId || msg.confirmationToken) && (
                <div className="rounded-2xl border border-[var(--color-status-warning)] bg-[var(--color-status-warning-bg)] p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-[var(--color-status-warning)]" />
                    <span className="text-xs font-bold text-[var(--color-status-warning)]">
                      يتطلب تأكيد المشرف
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] mb-3 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConfirm((msg.previewId || msg.confirmationToken)!, true)}
                      data-testid="confirm-action"
                    >
                      <CheckCircle className="w-3.5 h-3.5 ml-1" />
                      تأكيد التنفيذ
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleConfirm((msg.previewId || msg.confirmationToken)!, false)}
                      data-testid="reject-action"
                    >
                      <X className="w-3.5 h-3.5 ml-1" />
                      إلغاء
                    </Button>
                  </div>
                </div>
              )}

              {/* Execution Receipt with Undo */}
              {msg.type === 'execution-receipt' && (() => {
                const isFailed = msg.content.startsWith('فشل التنفيذ') || msg.content.startsWith('حدث خطأ');
                return (
                  <div
                    className={`rounded-2xl border p-4 shadow-sm ${
                      isFailed
                        ? 'border-[var(--color-status-danger)] bg-[var(--color-status-danger-bg)]'
                        : 'border-[var(--color-status-success)] bg-[var(--color-status-success-bg)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isFailed ? (
                          <AlertCircle className="w-4 h-4 text-[var(--color-status-danger)]" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-[var(--color-status-success)]" />
                        )}
                        <span
                          className={`text-xs font-bold ${
                            isFailed ? 'text-[var(--color-status-danger)]' : 'text-[var(--color-status-success)]'
                          }`}
                        >
                          {isFailed ? 'فشل تنفيذ الإجراء' : 'تم التنفيذ بنجاح'}
                        </span>
                      </div>
                      {!isFailed && msg.undoAvailable && msg.receiptId && msg.undoToken && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUndo(msg.receiptId!, msg.undoToken!)}
                          data-testid="undo-action"
                          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                        >
                          <Undo2 className="w-3.5 h-3.5 ml-1" />
                          تراجع
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                );
              })()}

              {/* Undo Result Notification */}
              {msg.type === 'undo-result' && (
                <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-sunken)] p-3 text-xs text-[var(--color-text-secondary)] flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-[var(--color-brand-primary)]" />
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
              )}

              {/* Regular Text Bubble */}
              {msg.type !== 'tool-result' && msg.type !== 'tool-call' && msg.type !== 'preview' && msg.type !== 'execution-receipt' && msg.type !== 'undo-result' && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[var(--color-brand-primary)] text-white shadow-sm'
                      : msg.type === 'error'
                      ? 'bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] border border-[var(--color-status-danger)]'
                      : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)]'
                  }`}
                >
                  {msg.content}
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-[var(--color-brand-primary)] text-white flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex gap-3 justify-start" data-testid="chat-loading-indicator">
            <div className="w-8 h-8 rounded-full bg-[var(--color-brand-primary-bg)] flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-4 h-4 text-[var(--color-brand-primary)] animate-pulse" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--color-brand-primary)]" />
              <span>تِبيان يبحث وينفذ الطلب...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="px-4 py-1.5 rounded-full bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] text-xs border border-[var(--color-status-danger)]">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] p-4">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Removable Attachment Chip */}
          {attachment && (
            <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] animate-fadeIn">
              <FileSpreadsheet className="w-4 h-4 text-[var(--color-brand-primary)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold truncate block">{attachment.fileName}</span>
                <span className="text-[10px] text-[var(--color-text-secondary)]">
                  {Math.round(attachment.sizeBytes / 1024)} كيلوبايت — جاهز للاستيراد
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="p-1 hover:bg-[var(--color-bg-base)] rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-status-danger)] transition-colors"
                title="إزالة الملف"
                data-testid="remove-attachment-btn"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {uploadingAttachment && (
            <div className="flex items-center gap-2 mb-2 p-2 rounded-xl bg-[var(--color-bg-sunken)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)]">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--color-brand-primary)]" />
              <span>جاري فحص ورفع المرفق بأمان...</span>
            </div>
          )}

          {fileError && (
            <div className="flex items-center justify-between gap-2 mb-2 p-2 rounded-xl bg-[var(--color-status-danger-bg)] border border-[var(--color-status-danger)] text-xs text-[var(--color-status-danger)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{fileError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFileError(null)}
                className="p-1 hover:bg-black/5 rounded text-[var(--color-status-danger)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-end bg-[var(--color-bg-base)] rounded-2xl border border-[var(--color-border-subtle)] p-2 focus-within:ring-2 focus-within:ring-[var(--color-brand-primary)] transition-all">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf"
              className="hidden"
              onChange={handleAttachFile}
              data-testid="platform-chat-file-input"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl h-10 w-10 p-0 flex items-center justify-center flex-shrink-0 text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)]"
              title="إرفاق ملف طلاب (.xlsx, .csv, .pdf)"
              data-testid="platform-chat-attach-btn"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب طلبك باللغة العربية (مثال: أنشئ مجموعة لكل صف دراسي)..."
              className="flex-1 resize-none rounded-xl bg-transparent px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none min-h-[44px] max-h-[180px] leading-relaxed"
              rows={1}
              dir="rtl"
              data-testid="platform-chat-input"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              disabled={(!input.trim() && !attachment) || sending || uploadingAttachment}
              className="rounded-xl h-10 w-10 p-0 flex items-center justify-center flex-shrink-0"
              data-testid="platform-chat-send"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
