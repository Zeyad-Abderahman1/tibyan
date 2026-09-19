import { useState, useEffect, useCallback } from 'react';
import type {
  PrinterInfo,
  ThermalPaperWidth,
  ThermalPrintMethod,
  ThermalPrinterSettings,
} from '@tibyan/contracts';

const STORAGE_KEYS = {
  PRINTER: 'tibyan_thermal_printer',
  PAPER_WIDTH: 'tibyan_thermal_paper_width',
  PRINT_METHOD: 'tibyan_thermal_print_method',
  NETWORK_HOST: 'tibyan_thermal_network_host',
  NETWORK_PORT: 'tibyan_thermal_network_port',
  AUTO_CUT: 'tibyan_thermal_auto_cut',
  COPIES: 'tibyan_thermal_copies',
};

function getStoredItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return null;
}

function setStoredItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
}

export function useThermalPrinter() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);

  // Settings State
  const [selectedPrinter, setSelectedPrinter] = useState<string>(() => {
    return getStoredItem(STORAGE_KEYS.PRINTER) || '';
  });

  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>(() => {
    return (getStoredItem(STORAGE_KEYS.PAPER_WIDTH) as ThermalPaperWidth) || '80mm';
  });

  const [printMethod, setPrintMethod] = useState<ThermalPrintMethod>(() => {
    return (getStoredItem(STORAGE_KEYS.PRINT_METHOD) as ThermalPrintMethod) || 'SYSTEM_DRIVER';
  });

  const [networkHost, setNetworkHost] = useState<string>(() => {
    return getStoredItem(STORAGE_KEYS.NETWORK_HOST) || '192.168.1.200';
  });

  const [networkPort, setNetworkPort] = useState<number>(() => {
    const saved = getStoredItem(STORAGE_KEYS.NETWORK_PORT);
    return saved ? parseInt(saved, 10) : 9100;
  });

  const [autoCut, setAutoCut] = useState<boolean>(() => {
    const saved = getStoredItem(STORAGE_KEYS.AUTO_CUT);
    return saved !== null ? saved === 'true' : true;
  });

  const [copies, setCopies] = useState<number>(() => {
    const saved = getStoredItem(STORAGE_KEYS.COPIES);
    return saved ? Math.min(Math.max(parseInt(saved, 10), 1), 5) : 1;
  });

  // Action status
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);

  // Sync settings to localStorage
  const updateSelectedPrinter = useCallback((name: string) => {
    setSelectedPrinter(name);
    setStoredItem(STORAGE_KEYS.PRINTER, name);
  }, []);

  const updatePaperWidth = useCallback((width: ThermalPaperWidth) => {
    setPaperWidth(width);
    setStoredItem(STORAGE_KEYS.PAPER_WIDTH, width);
  }, []);

  const updatePrintMethod = useCallback((method: ThermalPrintMethod) => {
    setPrintMethod(method);
    setStoredItem(STORAGE_KEYS.PRINT_METHOD, method);
  }, []);

  const updateNetworkHost = useCallback((host: string) => {
    setNetworkHost(host);
    setStoredItem(STORAGE_KEYS.NETWORK_HOST, host);
  }, []);

  const updateNetworkPort = useCallback((port: number) => {
    setNetworkPort(port);
    setStoredItem(STORAGE_KEYS.NETWORK_PORT, port.toString());
  }, []);

  const updateAutoCut = useCallback((cut: boolean) => {
    setAutoCut(cut);
    setStoredItem(STORAGE_KEYS.AUTO_CUT, cut.toString());
  }, []);

  const updateCopies = useCallback((num: number) => {
    const safe = Math.min(Math.max(num, 1), 5);
    setCopies(safe);
    setStoredItem(STORAGE_KEYS.COPIES, safe.toString());
  }, []);

  // Fetch installed system printers
  const refreshPrinters = useCallback(async () => {
    setLoadingPrinters(true);
    try {
      if (window.tibyan?.thermal?.listPrinters) {
        const res = await window.tibyan.thermal.listPrinters();
        if (res.success && res.data) {
          setPrinters(res.data);
          // If no printer selected yet, pick default
          if (!selectedPrinter) {
            const def = res.data.find((p) => p.isDefault) || res.data[0];
            if (def) {
              updateSelectedPrinter(def.name);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Failed to load system printers:', err);
    } finally {
      setLoadingPrinters(false);
    }
  }, [selectedPrinter, updateSelectedPrinter]);

  useEffect(() => {
    refreshPrinters();
  }, [refreshPrinters]);

  const currentSettings: ThermalPrinterSettings = {
    printerName: selectedPrinter || undefined,
    paperWidth,
    printMethod,
    networkHost: printMethod === 'ESCPOS_NETWORK' ? networkHost : undefined,
    networkPort: printMethod === 'ESCPOS_NETWORK' ? networkPort : undefined,
    autoCut,
    copies,
  };

  // Trigger Receipt Print
  const printReceipt = useCallback(
    async (paymentId: string): Promise<boolean> => {
      setIsPrinting(true);
      setPrintError(null);
      setPrintSuccess(null);

      try {
        if (!window.tibyan?.thermal?.printReceipt) {
          throw new Error('خدمة الطباعة الحرارية غير متاحة في هذا النظام');
        }

        const res = await window.tibyan.thermal.printReceipt({
          paymentId,
          settings: currentSettings,
        });

        if (!res.success) {
          setPrintError(res.error?.message || 'فشل في إرسال الإيصال إلى الطابعة');
          return false;
        }

        setPrintSuccess(res.data?.message || 'تم إرسال الإيصال بنجاح');
        return true;
      } catch (err: any) {
        setPrintError(err.message || 'حدث خطأ غير متوقع أثناء الطباعة');
        return false;
      } finally {
        setIsPrinting(false);
      }
    },
    [currentSettings]
  );

  // Trigger Test Print
  const testPrint = useCallback(async (): Promise<boolean> => {
    setIsPrinting(true);
    setPrintError(null);
    setPrintSuccess(null);

    try {
      if (!window.tibyan?.thermal?.testPrint) {
        throw new Error('خدمة الطباعة الحرارية غير متاحة');
      }

      const res = await window.tibyan.thermal.testPrint({
        settings: currentSettings,
        paperWidth,
      });

      if (!res.success) {
        setPrintError(res.error?.message || 'فشل في إرسال إيصال الاختبار');
        return false;
      }

      setPrintSuccess(res.data?.message || 'تمت طباعة إيصال الاختبار بنجاح');
      return true;
    } catch (err: any) {
      setPrintError(err.message || 'حدث خطأ أثناء طباعة الاختبار');
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [currentSettings, paperWidth]);

  return {
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
    setPrintSuccess,
    setPrintError,
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
  };
}
