import React, { useState, useEffect } from 'react';
import {
  Printer,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Sliders,
  Scissors,
} from 'lucide-react';
import type { ThermalReceiptDto } from '@tibyan/contracts';
import { ThermalReceiptPreview } from './ThermalReceiptPreview.js';
import { useThermalPrinter } from './useThermalPrinter.js';

export interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId?: string;
  initialReceipt?: ThermalReceiptDto;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  isOpen,
  onClose,
  paymentId,
  initialReceipt,
}) => {
  const {
    printers,
    loadingPrinters,
    selectedPrinter,
    paperWidth,
    printMethod,
    networkHost,
    networkPort,
    autoCut,
    copies,
    isPrinting,
    printSuccess,
    printError,
    updateSelectedPrinter,
    updatePaperWidth,
    updatePrintMethod,
    updateNetworkHost,
    updateNetworkPort,
    updateAutoCut,
    updateCopies,
    refreshPrinters,
    printReceipt,
    testPrint,
  } = useThermalPrinter();

  const [receipt, setReceipt] = useState<ThermalReceiptDto | null>(initialReceipt || null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load authoritative receipt data from paymentId
  useEffect(() => {
    if (!isOpen) return;

    if (initialReceipt) {
      setReceipt(initialReceipt);
      return;
    }

    if (!paymentId) {
      // Create a fallback non-financial preview if no paymentId provided
      setReceipt({
        paymentId: 'preview-sample',
        receiptNumber: 'REC-2026-PREVIEW',
        studentId: 'student-sample',
        studentName: 'اسم الطالب للمعاينة',
        studentCode: 'TB-0000',
        gradeLevelNameAr: 'الصف الأول الثانوي',
        groupName: 'مجموعة الرياضيات',
        amountCents: 15000,
        amountFormatted: '١٥٠٫٠٠ ج.م',
        paymentMethod: 'CASH',
        paymentMethodNameAr: 'نقدي',
        paymentDate: new Date().toISOString().slice(0, 10),
        periodMonth: new Date().toISOString().slice(0, 7),
        remainingBalanceCents: 0,
        remainingBalanceFormatted: '٠٫٠٠ ج.م',
        teacherName: 'أ. زياد محمد (مدرس الرياضيات)',
        operatorName: 'المشرف',
        issuedAt: new Date().toISOString(),
        isTestReceipt: false,
      });
      return;
    }

    let isMounted = true;
    async function loadAuthoritativeData() {
      setLoadingReceipt(true);
      setLoadError(null);
      try {
        if (!window.tibyan?.thermal?.getReceiptData) {
          throw new Error('خدمة تحميل بيانات الإيصال غير متاحة');
        }
        const res = await window.tibyan.thermal.getReceiptData(paymentId!);
        if (isMounted) {
          if (res.success) {
            setReceipt(res.data);
          } else {
            setLoadError(res.error?.message || 'فشل تحميل بيانات الإيصال');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setLoadError(err.message || 'حدث خطأ أثناء تحميل بيانات الإيصال');
        }
      } finally {
        if (isMounted) setLoadingReceipt(false);
      }
    }

    loadAuthoritativeData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, paymentId, initialReceipt]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = async () => {
    if (!receipt) return;
    if (receipt.paymentId && receipt.paymentId !== 'preview-sample') {
      await printReceipt(receipt.paymentId);
    } else {
      await testPrint();
    }
  };

  return (
    <div
      dir="rtl"
      data-testid="thermal-receipt-modal"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                طباعة الإيصال الحراري (Thermal Receipt)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                معاينة وإرسال أمر الطباعة لطابعات الإيصالات (80mm / 58mm)
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="close-thermal-modal-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Two Columns */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left / Center Preview Pane (Cols 1-7) */}
          <div className="md:col-span-7 flex flex-col items-center bg-slate-100 dark:bg-slate-950/70 p-6 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Paper Width Selector Switch */}
            <div className="flex items-center gap-2 mb-4 bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                data-testid="paper-width-80mm"
                onClick={() => updatePaperWidth('80mm')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  paperWidth === '80mm'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                ورق 80 مم (قياسي)
              </button>
              <button
                type="button"
                data-testid="paper-width-58mm"
                onClick={() => updatePaperWidth('58mm')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  paperWidth === '58mm'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                ورق 58 مم (مدمج)
              </button>
            </div>

            {/* Receipt Paper Rendering */}
            {loadingReceipt ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
                <span className="text-sm">جاري تحميل بيانات الإيصال...</span>
              </div>
            ) : loadError ? (
              <div className="py-16 text-center text-rose-500 px-4">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-sm">{loadError}</p>
              </div>
            ) : receipt ? (
              <div className="max-h-[58vh] overflow-y-auto pr-1 pl-1 py-1 rounded">
                <ThermalReceiptPreview receipt={receipt} paperWidth={paperWidth} />
              </div>
            ) : null}
          </div>

          {/* Right Controls Pane (Cols 8-12) */}
          <div className="md:col-span-5 space-y-4">
            {/* Status alerts */}
            {printSuccess && (
              <div
                data-testid="print-success-alert"
                className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{printSuccess}</span>
              </div>
            )}
            {printError && (
              <div
                data-testid="print-error-alert"
                className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{printError}</span>
              </div>
            )}

            {/* Configuration Card */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-slate-500" />
                  إعدادات الطابعة
                </span>
                <button
                  type="button"
                  onClick={refreshPrinters}
                  disabled={loadingPrinters}
                  title="تحديث قائمة الطابعات"
                  className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingPrinters ? 'animate-spin' : ''}`} />
                  تحديث
                </button>
              </div>

              {/* Printer Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  اختر الطابعة
                </label>
                <select
                  data-testid="printer-select"
                  value={selectedPrinter}
                  onChange={(e) => updateSelectedPrinter(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="">الطابعة الافتراضية للنظام</option>
                  {printers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.displayName || p.name} {p.isDefault ? ' (الافتراضية)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Print Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  طريقة الإرسال
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => updatePrintMethod('SYSTEM_DRIVER')}
                    className={`p-2 rounded-lg border text-center font-medium transition-all ${
                      printMethod === 'SYSTEM_DRIVER'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Windows Driver
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePrintMethod('ESCPOS_NETWORK')}
                    className={`p-2 rounded-lg border text-center font-medium transition-all ${
                      printMethod === 'ESCPOS_NETWORK'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    ESC/POS Network
                  </button>
                </div>
              </div>

              {/* Network Settings if ESCPOS_NETWORK */}
              {printMethod === 'ESCPOS_NETWORK' && (
                <div className="space-y-2 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      عنوان IP الطابعة (Host)
                    </label>
                    <input
                      type="text"
                      value={networkHost}
                      onChange={(e) => updateNetworkHost(e.target.value)}
                      placeholder="192.168.1.200"
                      className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">
                      المنفذ (Port)
                    </label>
                    <input
                      type="number"
                      value={networkPort}
                      onChange={(e) => updateNetworkPort(parseInt(e.target.value, 10) || 9100)}
                      className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Toggles: Auto-cut & Copies */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCut}
                    onChange={(e) => updateAutoCut(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="flex items-center gap-1">
                    <Scissors className="w-3.5 h-3.5 text-slate-500" />
                    قص الورق آلياً (Auto-cut)
                  </span>
                </label>

                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-600 dark:text-slate-400">النسخ:</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={copies}
                    onChange={(e) => updateCopies(parseInt(e.target.value, 10) || 1)}
                    className="w-12 text-center text-xs font-bold py-1 px-1 rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                data-testid="confirm-print-receipt-button"
                onClick={handlePrint}
                disabled={isPrinting || !receipt}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-600/20 disabled:opacity-50 transition-all text-sm"
              >
                <Printer className={`w-4 h-4 ${isPrinting ? 'animate-bounce' : ''}`} />
                <span>{isPrinting ? 'جاري الإرسال للطابعة...' : 'طباعة الإيصال'}</span>
              </button>

              <button
                type="button"
                data-testid="test-print-button"
                onClick={testPrint}
                disabled={isPrinting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-colors"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>طباعة إيصال تجريبي (Test Print)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
