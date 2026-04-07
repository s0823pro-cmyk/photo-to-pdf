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

export type PdfQualityId = 'high' | 'medium' | 'low' | 'ultra_low';

export type GridColumns = '2' | '3' | '5';

/** 個別PDF生成時の共有方法。batch: 一度に共有 / individual: ファイルごとに共有 */
export type SendMode = 'batch' | 'individual';
