export type PhotoPageOrientation = 'portrait' | 'landscape' | 'auto';

export interface Photo {
  id: string;
  dataUrl: string;
  fileName: string;
  /** PDF のページ向き。未設定・'auto' は画像の縦横比で自動 */
  orientation?: PhotoPageOrientation;
}

export interface AppState {
  isPro: boolean;
}

export const MAX_FREE_PHOTOS = 3;

export type PaperSizeId = 'a3' | 'a4' | 'b5';

export type PdfQualityId = 'high' | 'medium' | 'low';

export type GridColumns = '2' | '3' | '5';
