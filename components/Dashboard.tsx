
import React, { useState, useMemo, useEffect } from 'react';
import { Upload, File as FileIcon, Loader2, Plus, Trash2, Wand2, Download, Search, FileDigit, AlertCircle, AlertTriangle, Eye, EyeOff, Info, Calendar, Scan, Sparkles, RefreshCw, X, ChevronLeft, ChevronRight, Maximize2, CheckCircle2 } from 'lucide-react';
import { NotarialAct, ProcessedFile } from '../types';
import { getPDFPageCount, splitAndZipPDF } from '../services/pdfService';
// import { analyzeNotarialText, discoverActsInText } from '../services/groqService'; // Removed for local-only mode
import { performOCR, OCRError, loadPDFForOCR, initTesseractWorker, terminateTesseractWorker, extractTextLayer } from '../services/ocrService';
import * as pdfjsLib from 'pdfjs-dist';
import clsx from 'clsx';

// Worker setup is handled in ocrService.ts

const PreviewModal: React.FC<{
  file: File,
  act: NotarialAct,
  onClose: () => void
}> = ({ file, act, onClose }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(act.startPage);

  useEffect(() => {
    let isMounted = true;
    const renderPage = async () => {
      setLoading(true);
      try {
        const getDocument = (pdfjsLib as any).getDocument || (window as any).pdfjsLib?.getDocument;
        if (!getDocument) return;

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(currentPage);

        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          if (isMounted) setImageUrl(canvas.toDataURL('image/jpeg', 0.85));
        }
      } catch (e) {
        console.error("Preview error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    renderPage();
    return () => { isMounted = false; };
  }, [file, currentPage]);

  const totalActPages = act.endPage - act.startPage + 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-esprint-600" />
              Vista Previa: {act.code || 'Acto sin código'}
            </h3>
            <p className="text-xs text-gray-500">Mostrando foja {currentPage} de {act.endPage}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-grow overflow-auto p-6 flex items-center justify-center bg-gray-100 relative group">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-esprint-600" />
              <p className="text-sm font-medium text-gray-400">Renderizando foja...</p>
            </div>
          ) : imageUrl ? (
            <img src={imageUrl} className="max-w-full h-auto shadow-lg border border-gray-300 rounded-sm" alt="Preview" />
          ) : (
            <p className="text-red-500 text-sm">Error al cargar la imagen. Intente de nuevo.</p>
          )}

          {totalActPages > 1 && (
            <>
              <button
                disabled={currentPage <= act.startPage}
                onClick={() => setCurrentPage(p => p - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white shadow-md rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <button
                disabled={currentPage >= act.endPage}
                onClick={() => setCurrentPage(p => p + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/80 hover:bg-white shadow-md rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-6 h-6 text-gray-700" />
              </button>
            </>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-center gap-2">
          {Array.from({ length: Math.min(10, totalActPages) }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(act.startPage + i)}
              className={clsx(
                "w-2.5 h-2.5 rounded-full transition-all",
                currentPage === act.startPage + i ? "bg-esprint-600 w-6" : "bg-gray-300 hover:bg-gray-400"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const [currentFile, setCurrentFile] = useState<ProcessedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewingAct, setPreviewingAct] = useState<NotarialAct | null>(null);
  const [analyzingActId, setAnalyzingActId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrErrors, setOcrErrors] = useState<{ page: number, message: string, retrying?: boolean }[]>([]);
  const [fullCleanedText, setFullCleanedText] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedType, setSelectedType] = useState<string>("P");

  const actTypes = [
    { value: "P", label: "P - PROTOCOLOS" },
    { value: "D", label: "D - DILIGENCIAS" },
    { value: "O", label: "O - OTROS" },
    { value: "A", label: "A - ARRIENDOS" }
  ];

  const validateActCode = (code: string) => {
    if (!code) return true;
    return /^\d{4}\d{7}[P|D|O|A]\d{5}$/i.test(code);
  };

  const cleanOcrText = (text: string): string => {
    return text
      .replace(/[^\w\s\dÁÉÍÓÚáéíóúÑñ.,;:\-\/()]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  };

  // Lógica de Reconocimiento Local Avanzada (Sin IA)
  // Lógica de Reconocimiento Local Avanzada (Guiada por Usuario)
  const findCodesLocally = (text: string) => {
    // Matriz de confusión para el año seleccionado
    const yearPattern = selectedYear.split('').map(d => {
      if (d === '0') return '[0|O|o|D|Q]';
      if (d === '1') return '[1|I|l|!]';
      if (d === '2') return '[2|Z]';
      if (d === '8') return '[8|B]';
      return d;
    }).join('');

    // Matriz de confusión para el código notarial constante: 1101007
    // 1->[1|I|l|!|\|], 0->[0|O|o|D|Q], 7->[7|T]
    // Patrón flexible para 1101007:
    const notaryPattern = `[1Il!|][1Il!|][0OoDQ][1Il!|][0OoDQ][0OoDQ][7T]`;

    // Matriz de confusión para la letra seleccionada
    const charMap: Record<string, string> = {
      'P': '[P]', 'D': '[D|0|O]', 'O': '[O|0|D]', 'C': '[C|G]', 'A': '[A|4]'
    };
    const typePattern = charMap[selectedType] || `[${selectedType}]`;

    // Regex Dinámico: Año(Selected) - Notaria(Fixed 1101007) - Letra(Selected) - Secuencia(5d)
    const regexStr = `(${yearPattern})\\s*(${notaryPattern})\\s*(${typePattern})\\s*([0-9OQZDBIil|!]{5})`;

    // Fallback: Si no encuentra el patrón estricto 1101007, busca genérico para no romper todo
    // Pero el usuario dijo "siempre va ser 1101007", así que priorizamos esto.
    const regex = new RegExp(regexStr, 'gi');

    const matches = [...text.matchAll(regex)];
    return matches.map(m => {
      const year = selectedYear;

      // Forzamos la constante 1101007 ya que el usuario indicó que es fija
      const notary = "1101007";

      const letter = selectedType;

      let sequence = m[4]
        .replace(/[OQD]/gi, '0')
        .replace(/Z/gi, '2')
        .replace(/B/gi, '8')
        .replace(/[l|I|i|!]/g, '1');

      return `${year}${notary}${letter}${sequence}`;
    });
  };

  const checkOverlap = (actId: string, start: number, end: number) => {
    if (!currentFile) return false;
    return currentFile.acts.some(act => act.id !== actId && (start <= act.endPage && end >= act.startPage));
  };

  const hasAnyOverlap = useMemo(() => currentFile?.acts.some(act => checkOverlap(act.id, act.startPage, act.endPage)), [currentFile]);
  const hasInvalidCodes = useMemo(() => currentFile?.acts.some(act => act.code && !validateActCode(act.code)), [currentFile]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) await processFile(e.target.files[0]);
  };

  /* PDF Processing State */
  const pdfDocumentRef = React.useRef<any>(null); // Store loaded PDF.js document

  // import { loadPDFForOCR } from '../services/ocrService'; // Add this to imports at top manually if needed, or assume auto-import

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError("Solo archivos PDF.");
      return;
    }
    try {
      setIsProcessing(true);
      setError(null);
      setOcrErrors([]);
      setFullCleanedText("");

      // Load PDF for OCR once here
      if (pdfDocumentRef.current) {
        // cleanup? pdfjs docs usually just garbage collect, but we can reset
        pdfDocumentRef.current = null;
      }
      // Assuming performOCR needs the doc, we need to load it.
      // But we can't import loadPDFForOCR easily if I don't see imports. 
      // I will add the import in a separate step or assume I can modify it.
      // Ideally I should have checked imports first.

      // Since I am modifying the function body, I will rely on the fact that I will add the import next.
      // For now, let's keep the logic sound.

      // We will perform the load inside autoDiscover acts? No, better here to fail fast if file is bad.
      // However, to keep it simple with existing imports, I need to make sure `loadPDFForOCR` is available.

      // Let's assume I will fix imports.
      const loadedDoc = await loadPDFForOCR(file);
      pdfDocumentRef.current = loadedDoc;
      const pages = loadedDoc.numPages; // Use the count from the loaded doc directly! Faster than getPDFPageCount

      setCurrentFile({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        pageCount: pages,
        status: 'pending',
        acts: []
      });
    } catch (err) {
      console.error(err);
      setError("Error al cargar el PDF. El archivo podría estar dañado o bloqueado.");
    } finally {
      setIsProcessing(false);
    }
  };

  const autoDiscoverActs = async () => {
    if (!currentFile || !pdfDocumentRef.current) return;
    setIsScanning(true);
    setOcrErrors([]);
    let worker: any = null;

    try {
      // 1. Initialize Worker Pool (Once)
      worker = await initTesseractWorker();

      const totalPages = currentFile.pageCount;
      const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);

      // BATCH SIZE: Process 4 pages in parallel (Optimal for most CPUs)
      const CHUNK_SIZE = 4;
      let allFoundCodes: Set<string> = new Set();
      let candidates: { code: string, page: number }[] = [];

      for (let i = 0; i < pagesArray.length; i += CHUNK_SIZE) {
        const chunk = pagesArray.slice(i, i + CHUNK_SIZE);

        // 2. Parallel Processing
        const chunkResults = await Promise.all(chunk.map(async (p) => {
          try {
            // A. Try Native Text (Fastest)
            let text = await extractTextLayer(pdfDocumentRef.current, p);

            // B. Fallback to OCR (Reusing worker)
            if (!text || text.length < 50) {
              text = await performOCR(pdfDocumentRef.current, p, worker);
            }

            return { page: p, text, error: null };
          } catch (e) {
            return { page: p, text: "", error: e };
          }
        }));

        // 3. Process Results
        for (const res of chunkResults) {
          if (res.error) {
            setOcrErrors(prev => [...prev, { page: res.page, message: "Error de lectura", retrying: false }]);
            continue;
          }

          const cleaned = cleanOcrText(res.text);
          const codesOnPage = findCodesLocally(cleaned);

          codesOnPage.forEach(code => {
            if (!allFoundCodes.has(code)) {
              allFoundCodes.add(code);
              candidates.push({ code, page: res.page });
            }
          });
        }

        // Update Progress
        setProgress(Math.round(((i + chunk.length) / totalPages) * 100));
        await new Promise(resolve => setTimeout(resolve, 10)); // UI Breath
      }

      // 4. Merge Candidates
      if (candidates.length === 0) {
        alert("No se encontraron códigos. Intente cambiar el Año/Tipo o revise el PDF.");
      } else {
        const newActs = candidates.map(c => ({
          id: crypto.randomUUID(),
          startPage: c.page,
          endPage: Math.min(c.page + 5, currentFile.pageCount),
          code: c.code,
          description: "Acto Detectado Automáticamente",
          grantors: "",
          actDate: "",
          suggestedByAI: true
        })).sort((a, b) => a.startPage - b.startPage);

        // Smart Range Adjustment
        for (let i = 0; i < newActs.length - 1; i++) {
          newActs[i].endPage = newActs[i + 1].startPage - 1;
        }

        const currentCodes = currentFile.acts.map(a => a.code);
        const filteredNewActs = newActs.filter(a => !currentCodes.includes(a.code));

        if (filteredNewActs.length > 0) {
          setCurrentFile(prev => prev ? { ...prev, acts: [...prev.acts, ...filteredNewActs].sort((a, b) => a.startPage - b.startPage) } : null);
        } else {
          alert("Se encontraron códigos, pero ya existen en la lista.");
        }
      }

    } catch (e) {
      console.error(e);
      setError("Error durante el escaneo inteligente.");
    } finally {
      // 5. Cleanup Worker
      if (worker) await terminateTesseractWorker(worker);
      setIsScanning(false);
      setProgress(0);
    }
  };

  const retryOcrPage = async (page: number) => {
    if (!currentFile || !pdfDocumentRef.current) return;
    setOcrErrors(prev => prev.map(err => err.page === page ? { ...err, retrying: true } : err));

    try {
      const text = await performOCR(pdfDocumentRef.current, page, null);
      const cleaned = cleanOcrText(text);
      const newCombinedText = fullCleanedText + `\n--- FOJA ${page} (Retry) ---\n${cleaned}`;
      setFullCleanedText(newCombinedText);
      setOcrErrors(prev => prev.filter(err => err.page !== page));

      const localFound = findCodesLocally(newCombinedText);
      const suggestions = localFound.map((code: string) => ({
        code: code,
        type: "Acto Recuperado (Local)",
        grantors: "",
        date: ""
      }));

      if (suggestions && suggestions.length > 0) {
        // ... (Merge logic remains same)
        const currentCodes = currentFile.acts.map(a => a.code);
        const newActs = suggestions
          .filter((s: any) => s.code && !currentCodes.includes(s.code.toUpperCase()))
          .map((s: any) => ({
            id: crypto.randomUUID(),
            startPage: page,
            endPage: Math.min(page + 5, currentFile.pageCount),
            code: s.code.toUpperCase(),
            description: s.type || "Acto Recuperado",
            grantors: s.grantors || "",
            actDate: s.date || "",
            suggestedByAI: true
          }));

        if (newActs.length > 0) {
          setCurrentFile({ ...currentFile, acts: [...currentFile.acts, ...newActs].sort((a, b) => a.startPage - b.startPage) });
        }
      }
    } catch (e) {
      setOcrErrors(prev => prev.map(err => err.page === page ? { ...err, retrying: false, message: "Falló nuevamente." } : err));
    }
  };

  const addAct = () => {
    if (!currentFile) return;
    const lastEnd = currentFile.acts[currentFile.acts.length - 1]?.endPage || 0;
    if (lastEnd >= currentFile.pageCount) return alert("Todas las fojas están asignadas.");
    const newAct: NotarialAct = {
      id: crypto.randomUUID(),
      startPage: lastEnd + 1,
      endPage: Math.min(lastEnd + 5, currentFile.pageCount),
      code: '',
      description: 'Nuevo Acto',
      grantors: '',
      actDate: '',
      suggestedByAI: false
    };
    setCurrentFile({ ...currentFile, acts: [...currentFile.acts, newAct] });
  };

  const updateAct = (id: string, field: keyof NotarialAct, value: any) => {
    if (!currentFile) return;
    const updated = currentFile.acts.map(act => act.id === id ? { ...act, [field]: value } : act);
    setCurrentFile({ ...currentFile, acts: updated });
  };

  const removeAct = (id: string) => {
    if (currentFile) setCurrentFile({ ...currentFile, acts: currentFile.acts.filter(a => a.id !== id) });
  };

  // Function runOCRAndAnalysis removed as it depended on AI service. 
  // Manual entry or auto-scan is preferred.

  const handleDownload = async () => {
    // Solo bloqueamos si hay superposición crítica. 
    // Los códigos inválidos o errores OCR ahora son permitidos (bajo riesgo del usuario).
    if (!currentFile || hasAnyOverlap) return alert("Existe una superposición de fojas crítica. Por favor corrija los rangos de páginas.");

    if (hasInvalidCodes || ocrErrors.length > 0) {
      const confirm = window.confirm("Existen códigos incompletos o fojas con advertencias.\n\n¿Desea generar el ZIP de todas formas con la información disponible?");
      if (!confirm) return;
    }
    setIsProcessing(true);
    setProgress(0);
    try {
      const zipBlob = await splitAndZipPDF(currentFile.file, currentFile.acts, setProgress);
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LIBRO_NOTARIAL_${currentFile.name.replace('.pdf', '')}.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError("Error al generar el paquete ZIP.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredActs = useMemo(() => {
    if (!currentFile) return [];
    if (!searchQuery) return currentFile.acts;
    const lq = searchQuery.toLowerCase();
    return currentFile.acts.filter(a => a.code.toLowerCase().includes(lq) || a.description.toLowerCase().includes(lq));
  }, [currentFile, searchQuery]);

  if (!currentFile) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 w-full animate-fade-in-up">

        {/* Floating Toolbar for Settings */}
        <div className="glass-panel p-4 rounded-2xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-slate-700">
            <div className="p-2 bg-esprint-100 rounded-lg text-esprint-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Configuración</span>
              <span className="font-bold text-sm">Parámetros de Lectura</span>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <div className="flex flex-col w-full md:w-32">
              <label className="text-[10px] font-bold text-slate-400 mb-1 ml-1">AÑO</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="glass-input w-full p-2.5 rounded-xl font-bold text-slate-700 outline-none cursor-pointer"
              >
                {Array.from({ length: 17 }, (_, i) => 2014 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col w-full md:w-48">
              <label className="text-[10px] font-bold text-slate-400 mb-1 ml-1">TIPO DE ACTO</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="glass-input w-full p-2.5 rounded-xl font-bold text-slate-700 outline-none cursor-pointer"
              >
                {actTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div
          className={clsx(
            "relative group flex flex-col items-center justify-center border-4 border-dashed rounded-[2.5rem] p-16 transition-all duration-300",
            isDragging ? "border-esprint-500 bg-esprint-50/50 scale-[1.02]" : "border-slate-200 hover:border-esprint-300 bg-white/40 hover:bg-white/60",
            isProcessing && "opacity-50 pointer-events-none"
          )}
          onDragOver={(e) => { e.preventDefault(); if (!isProcessing) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={async (e) => { e.preventDefault(); setIsDragging(false); if (!isProcessing && e.dataTransfer.files[0]) await processFile(e.dataTransfer.files[0]); }}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <div className="absolute inset-0 bg-esprint-500 blur-xl opacity-20 animate-pulse"></div>
                <Loader2 className="relative w-20 h-20 text-esprint-600 animate-spin" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Procesando Documento...</h2>
                <p className="text-slate-500 font-medium">Analizando estructura y cargando en memoria segura.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-esprint-100 to-white p-8 rounded-full mb-8 shadow-xl shadow-esprint-100 group-hover:scale-110 transition-transform duration-300">
                <Upload className="w-16 h-16 text-esprint-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-3 text-center">Cargar Libro Notarial</h2>
              <p className="text-slate-500 mb-10 text-center max-w-md text-lg">
                Arrastre su PDF aquí o presione el botón para comenzar el análisis local.
              </p>

              <label className="relative cursor-pointer group overflow-hidden bg-gradient-to-r from-esprint-600 to-esprint-500 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-esprint-500/30 hover:shadow-esprint-500/50 hover:-translate-y-1 transition-all">
                <span className="relative z-10 flex items-center gap-2">
                  <FileIcon className="w-5 h-5" /> Seleccionar Archivo
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <input type="file" className="sr-only" onChange={handleFileSelect} disabled={isProcessing} />
              </label>
            </>
          )}
        </div>
        {error && (
          <div className="mt-6 flex justify-center animate-fade-in-up">
            <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {previewingAct && (
        <PreviewModal
          file={currentFile.file}
          act={previewingAct}
          onClose={() => setPreviewingAct(null)}
        />
      )}

      {error && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-xl shadow-xl font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-5">
          <AlertCircle className="w-6 h-6" />
          {error}
          <button onClick={() => setError(null)} className="ml-4 p-1 hover:bg-red-200 rounded-full"><X className="w-5 h-5" /></button>
        </div>
      )}

      <div className="glass-panel rounded-[2rem] p-6 mb-8 sticky top-20 z-40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl shadow-inner border border-red-100">
            <FileIcon className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-xl text-slate-800">{currentFile.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                {currentFile.pageCount} fojas
              </span>
              <span className="text-slate-400 text-xs">•</span>
              <span className="text-xs text-slate-500 font-medium">Lectura en memoria</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={autoDiscoverActs}
            disabled={isScanning || isProcessing}
            className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-esprint-50 text-esprint-700 rounded-xl text-sm font-bold border border-esprint-100 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
          >
            {isScanning ? <><Loader2 className="w-4 h-4 animate-spin" /> {progress}%</> : <><Sparkles className="w-4 h-4" /> Escaneo Inteligente</>}
          </button>
          <button
            onClick={handleDownload}
            disabled={isProcessing || isScanning || currentFile.acts.length === 0 || hasAnyOverlap}
            className={clsx(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-esprint-500/20 transition-all hover:-translate-y-0.5",
              (hasInvalidCodes || ocrErrors.length > 0) ? "bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white"
                : "bg-gradient-to-r from-esprint-600 to-esprint-500 hover:from-esprint-500 hover:to-esprint-400 text-white",
              "disabled:bg-gray-300 disabled:shadow-none disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed"
            )}
            title={hasInvalidCodes ? "Descargar con advertencias" : "Descargar ZIP"}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {hasInvalidCodes || ocrErrors.length > 0 ? "Generar con Alertas" : "Generar ZIP"}
          </button>
        </div>
      </div>

      {/* Error Panel Glass */}
      {ocrErrors.length > 0 && (
        <div className="mb-8 glass-panel border-l-4 border-l-orange-500 p-1 rounded-2xl overflow-hidden">
          <details className="group">
            <summary className="p-4 flex items-center justify-between cursor-pointer list-none hover:bg-orange-50/50 transition-colors">
              <div className="flex items-center gap-3 text-orange-800 font-bold text-sm">
                <div className="bg-orange-100 p-2 rounded-lg"><AlertCircle className="w-5 h-5 text-orange-600" /></div>
                Diagnóstico: {ocrErrors.length} fojas con advertencias (posibles páginas vacías o sin código)
              </div>
              <span className="text-xs text-orange-600 font-bold underline group-open:no-underline bg-white/50 px-3 py-1 rounded-lg">
                Ver detalles
              </span>
            </summary>

            <div className="p-4 bg-orange-50/30 border-t border-orange-100/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
              {ocrErrors.map((err, i) => (
                <div key={i} className="bg-white/80 p-3 rounded-xl flex items-center justify-between shadow-sm border border-orange-100">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Foja {err.page}</span>
                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">{err.message}</span>
                  </div>
                  <button
                    onClick={() => retryOcrPage(err.page)}
                    disabled={err.retrying}
                    className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    {err.retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Warning Panels */}
      {(hasAnyOverlap || hasInvalidCodes) && (
        <div className="mb-8 flex flex-col gap-3">
          {hasAnyOverlap && (
            <div className="glass-panel border-l-4 border-l-red-500 p-4 rounded-xl flex items-center gap-3 text-red-700 font-bold animate-pulse">
              <AlertTriangle className="w-5 h-5" /> ERROR CRÍTICO: Hay actos con fojas superpuestas. Corrija antes de exportar.
            </div>
          )}
          {hasInvalidCodes && (
            <div className="glass-panel border-l-4 border-l-orange-400 p-4 rounded-xl flex items-center gap-3 text-orange-700 font-bold">
              <Info className="w-5 h-5" /> Advertencia: Algunos actos tienen códigos con formato incompleto.
            </div>
          )}
        </div>
      )}

      <div className="space-y-6 mb-20">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-esprint-100 outline-none"
            />
          </div>
        </div>

        {filteredActs.length === 0 && !isScanning && (
          <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
            <Scan className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-gray-400">Sin actos identificados</h4>
            <p className="text-sm text-gray-400 mt-1">Haga clic en Escaneo Inteligente o añada uno manualmente.</p>
          </div>
        )}

        {filteredActs.map((act) => {
          const isOverlap = currentFile?.acts.some(other =>
            other.id !== act.id &&
            ((act.startPage >= other.startPage && act.startPage <= other.endPage) ||
              (act.endPage >= other.startPage && act.endPage <= other.endPage)));

          // Check regex format 17 chars
          const isValidFormat = /^\d{4}\d{7}[A-Z]\d{5}$/.test(act.code);

          return (
            <div
              key={act.id}
              className={clsx(
                "glass-panel rounded-3xl p-5 relative group transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ring-1",
                isOverlap ? "ring-red-300 bg-red-50/50" : isValidFormat ? "ring-white/50 hover:ring-esprint-200" : "ring-orange-200 bg-orange-50/30"
              )}
            >
              {/* Header Card */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className={clsx(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border",
                    act.suggestedByAI ? "bg-esprint-50 text-esprint-700 border-esprint-200" : "bg-slate-100 text-slate-600 border-slate-200"
                  )}>
                    {act.suggestedByAI ? "Auto" : "Manual"}
                  </span>
                  {!isValidFormat && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border bg-orange-50 text-orange-600 border-orange-200 flex items-center gap-1">
                      Review
                    </span>
                  )}
                </div>

                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setPreviewingAct(act)} className="p-2 hover:bg-esprint-100 text-esprint-600 rounded-xl transition-colors" title="Ver PDF">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => removeAct(act.id)} className="p-2 hover:bg-red-100 text-red-500 rounded-xl transition-colors" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Code Input */}
              <div className="mb-3">
                <label className="text-[10px] font-bold text-slate-400 ml-1 mb-1 block">CÓDIGO NOTARIAL</label>
                <div className="relative">
                  <FileDigit className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    value={act.code}
                    onChange={(e) => updateAct(act.id, 'code', e.target.value)}
                    className={clsx(
                      "w-full pl-10 pr-3 py-2 rounded-xl text-lg font-mono font-bold outline-none border transition-all bg-white/60 focus:bg-white focus:border-esprint-500 focus:ring-4 focus:ring-esprint-500/10",
                      !isValidFormat && act.code.length > 0 ? "border-orange-300 text-orange-700 focus:ring-orange-200" : "border-slate-200"
                    )}
                    placeholder="2024..."
                  />
                </div>
              </div>

              {/* Description Input */}
              <div className="mb-4">
                <input
                  value={act.description}
                  onChange={(e) => updateAct(act.id, 'description', e.target.value)}
                  className="w-full bg-transparent border-b border-slate-200 focus:border-esprint-500 py-1 text-sm font-medium text-slate-600 placeholder-slate-400 outline-none transition-colors"
                  placeholder="Descripción del acto..."
                />
              </div>

              {/* Pages & Validation */}
              <div className="bg-slate-50/50 rounded-xl p-3 flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Páginas:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      value={act.startPage}
                      onChange={(e) => updateAct(act.id, 'startPage', parseInt(e.target.value))}
                      className="w-12 text-center bg-white border border-slate-200 rounded-lg text-sm font-bold py-1 focus:border-esprint-500 outline-none"
                    />
                    <span className="text-slate-300">-</span>
                    <input
                      type="number"
                      value={act.endPage}
                      onChange={(e) => updateAct(act.id, 'endPage', parseInt(e.target.value))}
                      className="w-12 text-center bg-white border border-slate-200 rounded-lg text-sm font-bold py-1 focus:border-esprint-500 outline-none"
                    />
                  </div>
                </div>
                {isOverlap && (
                  <span className="text-xs font-bold text-red-600 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> Error
                  </span>
                )}
              </div>
            </div>
          )
        })}

        <button onClick={addAct} className="w-full py-12 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 hover:border-esprint-400 hover:text-esprint-600 hover:bg-esprint-50 transition-all flex flex-col items-center justify-center gap-2 group">
          <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Añadir Acto Manual</span>
        </button>
      </div>
    </div >
  );
};
