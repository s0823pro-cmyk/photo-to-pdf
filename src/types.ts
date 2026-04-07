export interface Photo {
  id: string;
  dataUrl: string;
  fileName: string;
}

export interface AppState {
  isPro: boolean;
}

export const MAX_FREE_PHOTOS = 3;

export type PaperSizeId = 'a3' | 'a4' | 'b5';

export type PdfQualityId = 'high' | 'medium' | 'low';

export type GridColumns = '2' | '3' | '5';
