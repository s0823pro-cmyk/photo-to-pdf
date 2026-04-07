export interface Photo {
  id: string;
  dataUrl: string;
  fileName: string;
}

export interface AppState {
  isPro: boolean;
}

export const MAX_FREE_PHOTOS = 3;
