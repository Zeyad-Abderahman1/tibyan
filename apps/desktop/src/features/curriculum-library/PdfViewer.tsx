import { useState, useEffect, useCallback } from 'react';
import { Button } from '@tibyan/design-system';
import { ArrowRight, ChevronRight, ChevronLeft, ExternalLink as ExternalLinkIcon } from 'lucide-react';

interface PdfViewerProps {
  documentId: string;
  onClose: () => void;
}

export function PdfViewer({ documentId, onClose }: PdfViewerProps) {
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPdf = async () => {
      if (!window.tibyan?.curriculumLibrary?.resolveDataUrl) return;
      setLoading(true);
      setError(null);
      try {
        const result = await window.tibyan.curriculumLibrary.resolveDataUrl(documentId);
        if (result.success && result.data) {
          setPdfDataUrl(result.data.dataUrl);
          setPageCount(result.data.pageCount);
          setTitle(result.data.title);
        } else {
          setError('فشل تحميل الملف');
        }
      } catch {
        setError('حدث خطأ أثناء تحميل الملف');
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
  }, [documentId]);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pageCount) {
      setCurrentPage(page);
    }
  }, [pageCount]);

  const handleOpenExternal = async () => {
    if (window.tibyan?.curriculumLibrary?.openExternal) {
      await window.tibyan.curriculumLibrary.openExternal(documentId);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--color-bg-app)]" dir="rtl">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-brand-primary)] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-[var(--color-text-secondary)]">جاري تحميل الملف...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--color-bg-app)]" dir="rtl">
        <div className="text-center space-y-3">
          <p className="text-sm text-[var(--color-status-danger)]">{error}</p>
          <Button variant="ghost" size="sm" onClick={onClose}>العودة للمكتبة</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg-app)]" dir="rtl" data-testid="pdf-viewer">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} data-testid="pdf-viewer-back">
            <ArrowRight className="w-4 h-4" />
            العودة للمكتبة
          </Button>
          <div className="h-4 w-px bg-[var(--color-border-subtle)]" />
          <h2 className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-md">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-text-secondary)]">
            صفحة {currentPage} من {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              data-testid="pdf-prev-page"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= pageCount}
              data-testid="pdf-next-page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
          <div className="h-4 w-px bg-[var(--color-border-subtle)]" />
          <Button variant="ghost" size="sm" onClick={handleOpenExternal} title="فتح في مستعرض خارجي">
            <ExternalLinkIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF iframe */}
      <div className="flex-1 overflow-hidden bg-[var(--color-bg-elevated)]">
        {pdfDataUrl && (
          <iframe
            src={pdfDataUrl}
            className="w-full h-full border-0"
            title={title}
            data-testid="pdf-iframe"
          />
        )}
      </div>
    </div>
  );
}
