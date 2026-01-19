
import React, { useState, useMemo, useEffect } from 'react';
import { Upload, File as FileIcon, Loader2, Plus, Trash2, Wand2, Download, Search, FileDigit, AlertCircle, AlertTriangle, Eye, EyeOff, Info, Calendar, Scan, Sparkles, RefreshCw, X, ChevronLeft, ChevronRight, Maximize2, CheckCircle2 } from 'lucide-react';
import { NotarialAct, ProcessedFile } from '../types';
import { getPDFPageCount, splitAndZipPDF } from '../services/pdfService';
import { analyzeNotarialText, discoverActsInText } from '../services/geminiService';
import { performOCR, OCRError } from '../services/ocrService';
import * as pdfjsLib from 'pdfjs-dist';
import clsx from 'clsx';

const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

if (typeof window !== 'undefined') {
  const pdfjs = (pdfjsLib as any);
  if (pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
  } else if ((window as any).pdfjsLib?.GlobalWorkerOptions) {
    (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
  }
}

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
              <Eye className="w-4 h-4 text-esprint-600"/>
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
  const [ocrErrors, setOcrErrors] = useState<{page: number, message: string, retrying?: boolean}[]>([]);
  const [fullCleanedText, setFullCleanedText] = useState<string>("");

  const validateActCode = (code: string) => {
    if (!code) return true;
    return /^\d{4}\d{7}[P|D|A|O|C]\d{5}$/i.test(code);
  };

  const cleanOcrText = (text: string): string => {
    return text
      .replace(/[^\w\s\dÁÉÍÓÚáéíóúÑñ.,;:\-\/()]/g, '')
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  };

  // Fallback local regex para encontrar códigos si la IA falla
  const findCodesLocally = (text: string) => {
    const regex = /\b(20\d{2})(\d{7})([A-Z])(\d{5})\b/g;
    const matches = [...text.matchAll(regex)];
    return matches.map(m => m[0]);
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
      const pages = await getPDFPageCount(file);
      setCurrentFile({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        pageCount: pages,
        status: 'pending',
        acts: []
      });
    } catch (err) {
      setError("Error al cargar el PDF.");
    } finally {
      setIsProcessing(false);
    }
  };

  const autoDiscoverActs = async () => {
    if (!currentFile) return;
    setIsScanning(true);
    setOcrErrors([]);
    try {
      let combinedText = "";
      const totalPages = currentFile.pageCount;
      
      // ESTRATEGIA MEJORADA: 
      // 1. Escanear las primeras 3 páginas (casi siempre hay un acto al inicio).
      // 2. Luego saltar con un paso calculado.
      const pagesToScan = new Set<number>();
      for (let i = 1; i <= Math.min(3, totalPages); i++) pagesToScan.add(i);
      
      const step = Math.max(5, Math.floor(totalPages / 15));
      for (let i = 4; i <= totalPages; i += step) pagesToScan.add(i);
      
      const pagesArray = Array.from(pagesToScan).sort((a,b) => a-b);
      let scannedCount = 0;

      for (const p of pagesArray) {
        scannedCount++;
        setProgress(Math.round((scannedCount / pagesArray.length) * 100));
        
        try {
          const text = await performOCR(currentFile.file, p);
          const cleaned = cleanOcrText(text);
          combinedText += `\n--- FOJA ${p} ---\n${cleaned}`;
        } catch (ocrErr) {
          const msg = ocrErr instanceof OCRError ? ocrErr.message : "Error OCR.";
          setOcrErrors(prev => [...prev, { page: p, message: msg }]);
        }
      }

      setFullCleanedText(combinedText);
      
      // Paso 1: Intentar con Gemini
      let suggestions = await discoverActsInText(combinedText);
      
      // Paso 2: Fallback local si Gemini no encontró nada
      if (!suggestions || suggestions.length === 0) {
        console.log("Gemini no encontró actos, intentando búsqueda local...");
        const localCodes = findCodesLocally(combinedText);
        if (localCodes.length > 0) {
          suggestions = localCodes.map(code => ({
            code: code,
            type: "Acto Detectado (Local)",
            grantors: "",
            date: ""
          }));
        }
      }

      // Eliminar duplicados basados en código
      const uniqueSuggestions = suggestions.reduce((acc: any[], current: any) => {
        const x = acc.find(item => item.code === current.code);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);
      
      if (uniqueSuggestions.length > 0) {
        const avgPagesPerAct = Math.floor(totalPages / uniqueSuggestions.length);
        const discoveredActs = uniqueSuggestions.map((s: any, i: number) => ({
          id: crypto.randomUUID(),
          startPage: (i * avgPagesPerAct) + 1,
          endPage: (i === uniqueSuggestions.length - 1) ? totalPages : (i + 1) * avgPagesPerAct,
          code: (s.code || "").toUpperCase(),
          description: s.type || "Acto Detectado",
          grantors: s.grantors || "",
          actDate: s.date || "",
          suggestedByAI: true
        }));
        setCurrentFile({ ...currentFile, acts: discoveredActs });
      } else {
        alert("No se identificaron códigos. Intente: 1) Reintentar fojas con error, 2) Verificar que el PDF sea legible, o 3) Añadir manualmente.");
      }

    } catch (e) {
      console.error("Discovery failed:", e);
      alert("Ocurrió un error en el proceso de escaneo.");
    } finally {
      setIsScanning(false);
      setProgress(0);
    }
  };

  const retryOcrPage = async (page: number) => {
    if (!currentFile) return;
    setOcrErrors(prev => prev.map(err => err.page === page ? { ...err, retrying: true } : err));
    
    try {
      const text = await performOCR(currentFile.file, page);
      const cleaned = cleanOcrText(text);
      const newCombinedText = fullCleanedText + `\n--- FOJA ${page} (Retry) ---\n${cleaned}`;
      setFullCleanedText(newCombinedText);
      setOcrErrors(prev => prev.filter(err => err.page !== page));
      
      // Re-analizar todo el texto combinado con el nuevo fragmento
      const suggestions = await discoverActsInText(newCombinedText);
      
      if (suggestions && suggestions.length > 0) {
          const currentCodes = currentFile.acts.map(a => a.code);
          const newActs = suggestions
            .filter((s:any) => s.code && !currentCodes.includes(s.code.toUpperCase()))
            .map((s:any) => ({
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
              setCurrentFile({ ...currentFile, acts: [...currentFile.acts, ...newActs].sort((a,b) => a.startPage - b.startPage) });
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

  const runOCRAndAnalysis = async (act: NotarialAct) => {
    if (!currentFile) return;
    setAnalyzingActId(act.id);
    try {
      const rawText = await performOCR(currentFile.file, act.startPage);
      const cleanedText = cleanOcrText(rawText);
      const analysis = await analyzeNotarialText(cleanedText);
      updateAct(act.id, 'code', (analysis.code || '').toUpperCase());
      updateAct(act.id, 'description', analysis.type);
      updateAct(act.id, 'grantors', analysis.grantors);
      updateAct(act.id, 'actDate', analysis.date);
      updateAct(act.id, 'suggestedByAI', true);
    } catch (e) {
      const msg = e instanceof OCRError ? e.message : "Error al procesar la foja.";
      alert(`Error en foja ${act.startPage}: ${msg}`);
    } finally {
      setAnalyzingActId(null);
    }
  };

  const handleDownload = async () => {
    if (!currentFile || hasAnyOverlap || hasInvalidCodes) return alert("Corrija los errores antes de continuar.");
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
      <div className="max-w-4xl mx-auto px-6 py-20">
        <div 
          className={clsx(
            "flex flex-col items-center justify-center border-4 border-dashed rounded-3xl p-20 transition-all", 
            isDragging ? "border-esprint-500 bg-esprint-50" : "border-gray-200 hover:border-gray-300",
            isProcessing && "opacity-50 pointer-events-none"
          )}
          onDragOver={(e) => { e.preventDefault(); if (!isProcessing) setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={async (e) => { e.preventDefault(); setIsDragging(false); if (!isProcessing && e.dataTransfer.files[0]) await processFile(e.dataTransfer.files[0]); }}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-16 h-16 text-esprint-600 animate-spin" />
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Cargando PDF...</h2>
                <p className="text-gray-500">Analizando estructura del documento.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-esprint-100 p-6 rounded-full mb-6"><Upload className="w-12 h-12 text-esprint-600" /></div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Cargar Libro PDF</h2>
              <p className="text-gray-500 mb-8 text-center max-w-sm">Arrastre el archivo digitalizado para iniciar el reconocimiento automático.</p>
              <label className="cursor-pointer bg-esprint-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-esprint-700 transition-all shadow-lg shadow-esprint-200">
                Seleccionar Archivo
                <input type="file" className="sr-only" onChange={handleFileSelect} disabled={isProcessing} />
              </label>
            </>
          )}
        </div>
        {error && <p className="mt-4 text-center text-red-600 font-medium">{error}</p>}
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8 sticky top-20 z-40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-xl"><FileIcon className="w-6 h-6 text-red-600" /></div>
            <div>
              <h3 className="font-bold text-gray-900">{currentFile.name}</h3>
              <p className="text-xs text-gray-500">{currentFile.pageCount} fojas totales</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={autoDiscoverActs} 
              disabled={isScanning || isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 bg-esprint-50 text-esprint-700 rounded-xl text-sm font-bold border border-esprint-200 hover:bg-esprint-100 transition-all disabled:opacity-50"
            >
              {isScanning ? <><Loader2 className="w-4 h-4 animate-spin"/> {progress}%</> : <><Sparkles className="w-4 h-4"/> Escaneo Inteligente</>}
            </button>
            <button 
              onClick={handleDownload} 
              disabled={isProcessing || isScanning || currentFile.acts.length === 0 || hasAnyOverlap || hasInvalidCodes}
              className="flex items-center gap-2 px-6 py-2.5 bg-esprint-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-esprint-700 disabled:bg-gray-300 transition-all"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>} Generar ZIP
            </button>
          </div>
        </div>
        
        {ocrErrors.length > 0 && (
          <div className="mt-4 p-5 bg-orange-50 border border-orange-200 rounded-2xl shadow-sm">
             <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2 text-orange-800 font-bold text-sm">
                  <AlertCircle className="w-5 h-5"/> 
                  Diagnóstico de Lectura: {ocrErrors.length} fojas con advertencias
               </div>
               <span className="text-[10px] bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-bold uppercase">Acción Requerida</span>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                {ocrErrors.map((err, i) => (
                  <div key={i} className="bg-white border border-orange-100 p-3 rounded-xl flex items-center justify-between group">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-700">Foja {err.page}</span>
                      <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{err.message}</span>
                    </div>
                    <button 
                      onClick={() => retryOcrPage(err.page)}
                      disabled={err.retrying}
                      className="p-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50"
                    >
                      {err.retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <RefreshCw className="w-3.5 h-3.5"/>}
                    </button>
                  </div>
                ))}
             </div>
          </div>
        )}

        {ocrErrors.length === 0 && fullCleanedText && !isScanning && (
           <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
              <div className="bg-green-100 p-1.5 rounded-full"><CheckCircle2 className="w-4 h-4 text-green-600"/></div>
              <p className="text-xs font-medium text-green-700">Lectura inteligente completada.</p>
           </div>
        )}

        {(hasAnyOverlap || hasInvalidCodes) && (
          <p className="mt-4 text-xs text-red-600 font-bold flex items-center gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4"/> Corrija los errores de superposición o formato (17 caracteres) antes de exportar.
          </p>
        )}
      </div>

      <div className="space-y-6 mb-20">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400"/>
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
          const isOverlapping = checkOverlap(act.id, act.startPage, act.endPage);
          const isCodeValid = validateActCode(act.code);
          
          return (
            <div key={act.id} className={clsx("bg-white border rounded-2xl shadow-sm overflow-hidden transition-all group/card", (isOverlapping || !isCodeValid) ? "border-red-300 ring-2 ring-red-50" : "border-gray-200 hover:border-esprint-300 hover:shadow-md")}>
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-3 border-r border-gray-100 pr-6 flex flex-col gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Fojas (Inicio - Fin)</label>
                    <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                      <input type="number" min="1" value={act.startPage} onChange={(e) => updateAct(act.id, 'startPage', parseInt(e.target.value) || 1)} className="w-full bg-transparent text-center font-bold text-gray-900 focus:ring-0 border-0" />
                      <div className="w-px h-4 bg-gray-300"></div>
                      <input type="number" min="1" value={act.endPage} onChange={(e) => updateAct(act.id, 'endPage', parseInt(e.target.value) || 1)} className="w-full bg-transparent text-center font-bold text-gray-900 focus:ring-0 border-0" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => runOCRAndAnalysis(act)} disabled={analyzingActId === act.id} title="Analizar foja" className="flex-1 bg-esprint-50 text-esprint-700 p-2.5 rounded-xl text-xs font-bold hover:bg-esprint-100 border border-esprint-100 transition-all flex items-center justify-center">
                      {analyzingActId === act.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                    </button>
                    <button onClick={() => setPreviewingAct(act)} title="Ver imagen" className="flex-1 p-2.5 rounded-xl text-xs font-bold border bg-white text-gray-600 border-gray-200 hover:bg-gray-900 hover:text-white transition-all shadow-sm">
                      <Maximize2 className="w-4 h-4 mx-auto"/>
                    </button>
                    <button onClick={() => removeAct(act.id)} title="Eliminar" className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-6 gap-6">
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Código Alfanumérico (17 caracteres)</label>
                    <input type="text" maxLength={17} value={act.code} onChange={(e) => updateAct(act.id, 'code', e.target.value.toUpperCase())} className={clsx("w-full px-4 py-3 rounded-xl border font-mono tracking-widest text-sm focus:ring-4 transition-all outline-none", !isCodeValid ? "border-red-400 bg-red-50 focus:ring-red-100" : "border-gray-200 focus:ring-esprint-50")} />
                    {!isCodeValid && act.code.length > 0 && <span className="text-[9px] text-red-500 font-bold mt-1">FORMATO INVÁLIDO</span>}
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Fecha</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-3 w-4 h-4 text-gray-300" />
                      <input type="text" value={act.actDate} onChange={(e) => updateAct(act.id, 'actDate', e.target.value)} className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-esprint-50 outline-none" />
                    </div>
                  </div>
                  <div className="md:col-span-6">
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Tipo de Acto / Partes</label>
                    <input type="text" value={act.description} onChange={(e) => updateAct(act.id, 'description', e.target.value)} placeholder="Ej: Compraventa..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm mb-3 outline-none focus:ring-4 focus:ring-esprint-50" />
                    <textarea rows={1} value={act.grantors} onChange={(e) => updateAct(act.id, 'grantors', e.target.value)} placeholder="Nombres de las partes..." className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none outline-none focus:ring-4 focus:ring-esprint-50" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <button onClick={addAct} className="w-full py-12 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 hover:border-esprint-400 hover:text-esprint-600 hover:bg-esprint-50 transition-all flex flex-col items-center justify-center gap-2 group">
          <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Añadir Acto Manual</span>
        </button>
      </div>
    </div>
  );
};
