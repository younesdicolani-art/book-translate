export enum TranslationStatus {
  IDLE = 'IDLE',
  READING_FILE = 'READING_FILE',
  TRANSLATING = 'TRANSLATING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface TranslationState {
  status: TranslationStatus;
  originalFile: File | null;
  fileUrl: string | null; // For displaying the PDF
  translatedText: string;
  errorMessage: string | null;
}

// Config for the file upload limits
export const MAX_FILE_SIZE_MB = 200;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
