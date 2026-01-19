import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// The worker URL from a reliable CDN
const WORKER_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const setupWorker = async () => {
  if (typeof window !== 'undefined') {
    try {
      // PDF.js often fails to load cross-origin workers directly in some environments.
      // We fetch it and create a local Blob URL to bypass strictly enforced SOP on importScripts.
      const response = await fetch(WORKER_URL);
      const blob = await response.blob();
      const localWorkerUrl = URL.createObjectURL(blob);
      
      const pdfjs = (pdfjsLib as any);
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = localWorkerUrl;
      } else if ((window as any).pdfjsLib?.GlobalWorkerOptions) {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerUrl;
      }
    } catch (e) {
      console.error("Failed to setup PDF.js worker via Blob fallback:", e);
      // Last resort: try setting the direct URL
      const pdfjs = (pdfjsLib as any);
      if (pdfjs.GlobalWorkerOptions) {
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_URL;
      }
    }
  }
};

// Initial setup attempt
setupWorker();

export class OCRError extends Error {
  constructor(public message: string, public page?: number, public originalError?: any) {
    super(message);
    this.name = 'OCRError';
  }
}

/**
 * Extracts text from a specific page of a PDF file using OCR with enhanced error handling.
 */
export const performOCR = async (file: File, pageNumber: number): Promise<string> => {
  let worker: Tesseract.Worker | null = null;
  try {
    const getDocument = (pdfjsLib as any).getDocument || (window as any).pdfjsLib?.getDocument;
    if (!getDocument) {
      throw new OCRError("El motor PDF.js no está disponible.");
    }

    const arrayBuffer = await file.arrayBuffer();
    // We use cMapUrl and standardFontDataUrl to ensure characters are correctly mapped if they use special encodings
    const loadingTask = getDocument({
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
    });
    
    const pdf = await loadingTask.promise;
    
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new OCRError(`La página ${pageNumber} no existe.`, pageNumber);
    }

    const page = await pdf.getPage(pageNumber);
    const scale = 2.0; 
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new OCRError("Error de memoria en el navegador.", pageNumber);
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    try {
      // Use standard CDN for Tesseract workers to avoid ESM resolution issues in workers
      worker = await (Tesseract as any).createWorker('spa', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.0.5/dist/worker.min.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.0.0/tesseract-core.wasm.js',
      });
    } catch (workerErr) {
      throw new OCRError("No se pudo inicializar Tesseract.", pageNumber, workerErr);
    }

    const { data: { text } } = await worker.recognize(canvas);
    await worker.terminate();
    worker = null;

    return text;
  } catch (error) {
    if (worker) await worker.terminate();
    if (error instanceof OCRError) throw error;
    
    throw new OCRError(
      `Error en página ${pageNumber}: ${error instanceof Error ? error.message : 'Fallo de procesamiento'}`,
      pageNumber,
      error
    );
  }
};
