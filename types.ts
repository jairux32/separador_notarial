export interface ProcessedFile {
    id: string;
    file: File;
    name: string;
    pageCount: number;
    status: 'pending' | 'analyzing' | 'ready' | 'processing' | 'completed';
    acts: NotarialAct[];
  }
  
  export interface NotarialAct {
    id: string;
    startPage: number;
    endPage: number;
    code: string; // The alphanumeric code required by law
    description: string;
    grantors: string; // Nombres de las partes
    actDate: string; // Fecha de emisión
    suggestedByAI: boolean;
    rawText?: string; // OCR content for search
  }
  
  export enum AppState {
    LANDING = 'LANDING',
    DASHBOARD = 'DASHBOARD'
  }

  export interface GeminiAnalysisResult {
    code: string;
    type: string;
    grantors: string;
    date: string;
    confidence: number;
  }