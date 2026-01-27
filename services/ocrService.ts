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
 * Initializes a Tesseract worker to be reused.
 */
export const initTesseractWorker = async (): Promise<Tesseract.Worker> => {
  try {
    const worker = await (Tesseract as any).createWorker('spa', 1, {
      workerPath: '/tesseract/worker.min.js',
      corePath: '/tesseract/tesseract-core.wasm.js',
      langPath: '/tesseract',
      cacheMethod: 'none', // Force local use
    });
    return worker;
  } catch (e) {
    console.error("Failed to init worker", e);
    throw new OCRError("No se pudo iniciar el motor OCR (Tesseract).");
  }
};

/**
 * Terminates a Tesseract worker.
 */
export const terminateTesseractWorker = async (worker: Tesseract.Worker | null) => {
  if (worker) {
    await worker.terminate();
  }
};

/**
 * Helper to load the PDF document once
 */
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
 * Attempts to extract text directly from the PDF text layer (fastest).
 */
export const extractTextLayer = async (pdfDoc: any, pageNumber: number): Promise<string | null> => {
  try {
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const textItems = textContent.items.map((item: any) => item.str).join(' ');

    // Simple heuristic: if we got > 50 chars, assume it's good text
    if (textItems.length > 50) {
      return textItems;
    }
    return null;
  } catch (e) {
    return null; // Fallback to OCR
  }
}

/**
 * Performs OCR on a specific page, reusing an existing worker and cropping top 30%.
 */
export const performOCR = async (
  pdfDoc: any,
  pageNumber: number,
  worker: Tesseract.Worker | null
): Promise<string> => {
  let localWorker = false;

  try {
    if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
      throw new OCRError(`La página ${pageNumber} no existe.`, pageNumber);
    }

    // Lazy init if no worker provided (fallback)
    if (!worker) {
      worker = await initTesseractWorker();
      localWorker = true;
    }

    const page = await pdfDoc.getPage(pageNumber);
    // Reduced scale for speed (1.5 is usually enough for Act Codes)
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new OCRError("Error de memoria en el navegador.", pageNumber);
    }

    // CROPPING: Use only top 30% of the page
    const CROP_PERCENT = 0.30;
    canvas.width = viewport.width;
    canvas.height = viewport.height * CROP_PERCENT;

    // Render only the top part to the canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
      transform: [1, 0, 0, 1, 0, 0], // Default transform
      background: 'white'
    }).promise;

    // Recognize
    const { data: { text } } = await worker.recognize(canvas);

    // Clean up local worker if we created it
    if (localWorker) {
      await worker.terminate();
    }

    // Help GC
    canvas.width = 0;
    canvas.height = 0;

    return text;
  } catch (error) {
    if (localWorker && worker) await worker.terminate();
    if (error instanceof OCRError) throw error;

    throw new OCRError(
      `Error en página ${pageNumber}: ${error instanceof Error ? error.message : 'Fallo de procesamiento'}`,
      pageNumber,
      error
    );
  }
};
