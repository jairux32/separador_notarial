import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { NotarialAct, ProcessedFile } from '../types';

export const getPDFPageCount = async (file: File): Promise<number> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    // Load only the header to get page count fast
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error("Error loading PDF:", error);
    throw new Error("No se pudo leer el archivo PDF.");
  }
};

export const splitAndZipPDF = async (
  originalFile: File,
  acts: NotarialAct[],
  onProgress: (percent: number) => void
): Promise<Blob> => {
  const arrayBuffer = await originalFile.arrayBuffer();
  // Add ignoreEncryption: true to prevent errors with passwordless encrypted files
  const originalPdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const zip = new JSZip();
  const totalActs = acts.length;

  for (let i = 0; i < totalActs; i++) {
    const act = acts[i];

    // Create a new PDF document
    const newPdf = await PDFDocument.create();

    // Calculate page indices (0-based)
    // Validate range
    const start = Math.max(0, act.startPage - 1);
    const end = Math.min(originalPdf.getPageCount() - 1, act.endPage - 1);

    if (start > end) continue;

    const pageIndices = [];
    for (let p = start; p <= end; p++) {
      pageIndices.push(p);
    }

    // Copy pages
    const copiedPages = await newPdf.copyPages(originalPdf, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));

    // Save the new PDF
    const pdfBytes = await newPdf.save();

    // Sanitize filename
    const sanitizedCode = act.code.replace(/[^a-z0-9]/gi, '_').toUpperCase() || 'SIN_CODIGO';
    const safeName = `${i + 1}_${sanitizedCode}`; // Prefix with index to guarantee uniqueness
    zip.file(`${safeName}.pdf`, pdfBytes);

    // Update progress
    onProgress(Math.round(((i + 1) / totalActs) * 100));
  }

  // Generate ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return zipBlob;
};