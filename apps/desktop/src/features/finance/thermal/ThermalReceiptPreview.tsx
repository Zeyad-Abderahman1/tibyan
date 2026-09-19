import React from 'react';
import type { ThermalReceiptDto, ThermalPaperWidth } from '@tibyan/contracts';

export interface ThermalReceiptPreviewProps {
  receipt: ThermalReceiptDto;
  paperWidth: ThermalPaperWidth;
  className?: string;
}

export const ThermalReceiptPreview: React.FC<ThermalReceiptPreviewProps> = ({
  receipt,
  paperWidth,
  className = '',
}) => {
  const is58mm = paperWidth === '58mm';

  return (
    <div
      dir="rtl"
      data-testid="thermal-receipt-preview"
      className={`relative font-mono text-black bg-[#fafafa] border border-gray-300 shadow-md p-4 transition-all select-text ${
        is58mm ? 'w-[250px] text-xs' : 'w-[340px] text-sm'
      } ${className}`}
      style={{
        fontFamily: "'Cairo', 'Courier New', Courier, monospace",
      }}
    >
      {/* Thermal receipt top serration/cut line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 opacity-60" />

      {/* 1. Header (Centered) */}
      <div className="text-center pb-2 border-b-2 border-dashed border-gray-400">
        <div className="inline-flex items-center justify-center gap-1 mb-1">
          {/* Monochrome Thermal Brand Icon */}
          <div className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center font-bold text-xs">
            ت
          </div>
          <span className={`font-extrabold tracking-tight ${is58mm ? 'text-base' : 'text-lg'}`}>
            تِبيان
          </span>
        </div>
        <div className="text-[11px] text-gray-700">مساعد المدرس الذكي</div>
        <div className="text-[12px] font-bold mt-0.5 text-black">
          {receipt.teacherName}
        </div>
      </div>

      {/* 2. Receipt Badge & Identifier */}
      <div className="text-center py-2 border-b-2 border-dashed border-gray-400">
        <div
          className={`font-bold inline-block px-2 py-0.5 border border-black mb-1.5 ${
            receipt.isTestReceipt ? 'bg-black text-white' : 'bg-transparent text-black'
          }`}
        >
          {receipt.isTestReceipt ? '*** إيصال اختبار تجريبي ***' : 'إيصال استلام رسوم'}
        </div>
        <div className="flex justify-between items-center text-[12px] font-bold px-1">
          <span>رقم الإيصال:</span>
          <span className="font-mono tracking-wider">{receipt.receiptNumber}</span>
        </div>
        <div className="flex justify-between items-center text-[11px] text-gray-700 px-1 mt-0.5">
          <span>التاريخ:</span>
          <span className="font-mono">{receipt.paymentDate}</span>
        </div>
      </div>

      {/* 3. Student & Academic Details */}
      <div className="py-2.5 border-b-2 border-dashed border-gray-400 space-y-1.5 text-[12px]">
        <div>
          <span className="text-gray-600 block text-[11px]">اسم الطالب:</span>
          <span className="font-bold text-black text-[13px] break-words block leading-snug">
            {receipt.studentName}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">كود الطالب:</span>
          <span className="font-bold font-mono tracking-wide">{receipt.studentCode}</span>
        </div>

        {receipt.gradeLevelNameAr && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">المرحلة الدراسية:</span>
            <span className="font-semibold text-gray-900">{receipt.gradeLevelNameAr}</span>
          </div>
        )}

        {receipt.groupName && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">المجموعة:</span>
            <span className="font-semibold text-gray-900 truncate max-w-[170px]" title={receipt.groupName}>
              {receipt.groupName}
            </span>
          </div>
        )}

        {receipt.periodMonth && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">اشتراك شهر:</span>
            <span className="font-mono font-semibold">{receipt.periodMonth}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-gray-600">طريقة الدفع:</span>
          <span className="font-semibold px-1 py-0.2 border border-gray-400 text-[11px]">
            {receipt.paymentMethodNameAr}
          </span>
        </div>
      </div>

      {/* 4. Financial Breakdown (High Contrast & Clear) */}
      <div className="py-3 border-b-2 border-dashed border-gray-400 text-center bg-gray-50 my-1 rounded">
        <div className="text-[12px] font-bold text-gray-700 mb-0.5">المبلغ المدفوع</div>
        <div className={`font-black text-black tracking-tight ${is58mm ? 'text-xl' : 'text-2xl'}`}>
          {receipt.amountFormatted}
        </div>

        {receipt.remainingBalanceFormatted !== undefined && (
          <div className="mt-2 pt-1.5 border-t border-dotted border-gray-300 flex justify-between items-center px-2 text-[12px]">
            <span className="text-gray-700">الرصيد المتبقي:</span>
            <span
              className={`font-bold font-mono ${
                (receipt.remainingBalanceCents ?? 0) > 0 ? 'text-black underline' : 'text-gray-800'
              }`}
            >
              {receipt.remainingBalanceFormatted}
            </span>
          </div>
        )}
      </div>

      {/* 5. Notes (if present) */}
      {receipt.notes && (
        <div className="py-2 border-b-2 border-dashed border-gray-400 text-[11px]">
          <span className="text-gray-600 block mb-0.5">ملاحظات:</span>
          <p className="text-gray-900 break-words leading-relaxed">{receipt.notes}</p>
        </div>
      )}

      {/* 6. Machine-Readable Thermal Barcode Element */}
      <div className="py-3 text-center border-b-2 border-dashed border-gray-400">
        <div className="inline-flex flex-col items-center justify-center">
          {/* High-contrast simulated Code128 bar pattern */}
          <div className="flex items-end justify-center h-8 gap-[1.5px] px-2 bg-white border border-gray-300 py-1">
            {[4, 2, 6, 1, 3, 5, 2, 7, 3, 1, 4, 2, 5, 3, 6, 2, 4, 1, 3, 5, 2, 4, 6, 2, 3, 5, 1, 4, 2, 6].map(
              (h, idx) => (
                <div
                  key={idx}
                  className="bg-black"
                  style={{
                    width: idx % 3 === 0 ? '2px' : '1px',
                    height: `${(h / 7) * 22 + 6}px`,
                  }}
                />
              )
            )}
          </div>
          <span className="font-mono text-[10px] tracking-widest mt-1 text-gray-700">
            *{receipt.receiptNumber}*
          </span>
        </div>
      </div>

      {/* 7. Footer & Integrity */}
      <div className="text-center pt-3 pb-1 space-y-1 text-[11px] text-gray-700">
        <div className="font-semibold text-black">شكراً لثقتكم بنا</div>
        <div>تِبيان — نظام إدارة المعلم</div>
        <div className="text-[10px] text-gray-500 font-mono mt-1">
          {new Date(receipt.issuedAt).toLocaleString('ar-EG', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        <div className="text-[9px] text-gray-400">
          المسؤول: {receipt.operatorName} | {paperWidth}
        </div>
      </div>

      {/* Subtle serrated bottom tear graphic */}
      <div className="mt-3 flex justify-between overflow-hidden opacity-30 text-gray-400 text-[10px]">
        {'▲▼'.repeat(is58mm ? 12 : 18)}
      </div>
    </div>
  );
};
