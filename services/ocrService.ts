import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

const setupWorker = () => {
  if (typeof window !== 'undefined') {
    const pdfjs = (pdfjsLib as any);
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
    }
  }
};

// Initial setup
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
// Helper to load the PDF document once
export const loadPDFForOCR = async (file: File): Promise<any> => {
  const getDocument = (pdfjsLib as any).getDocument || (window as any).pdfjsLib?.getDocument;
  if (!getDocument) throw new OCRError("El motor PDF.js no está disponible.");

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  });

  return await loadingTask.promise;
};

/**
 * Extracts text from a specific page using a PRE-LOADED PDF document to avoid reloading the file 600 times.
 */
export const performOCR = async (pdfDoc: any, pageNumber: number): Promise<string> => {
  let worker: Tesseract.Worker | null = null;
  try {
    if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
      throw new OCRError(`La página ${pageNumber} no existe.`, pageNumber);
    }

    const page = await pdfDoc.getPage(pageNumber);
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
      // Use standard CDN for Tesseract workers
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

    // Help GC
    canvas.width = 0;
    canvas.height = 0;

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
