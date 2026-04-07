import { jsPDF } from 'jspdf';
import type { Photo, PaperSizeId, PdfQualityId } from '../types';
import { Capacitor } from '@capacitor/core';

const PDF_QUALITY_NUM: Record<PdfQualityId, number> = {
  high: 0.92,
  medium: 0.7,
  low: 0.45,
};

/** 長辺の上限（px）。画質が低いほど小さくしてメモリを抑える */
const MAX_SIZE_BY_QUALITY: Record<PdfQualityId, number> = {
  high: 1600,
  medium: 1200,
  low: 800,
};

/** 縦（portrait）固定の用紙サイズ mm（幅 < 高さ） */
const PAPER_SIZES: Record<PaperSizeId, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a3: { width: 297, height: 420 },
  b5: { width: 182, height: 257 },
};

function pageDimensionsPortraitMm(paperSize: PaperSizeId): { pageWidth: number; pageHeight: number } {
  const s = PAPER_SIZES[paperSize];
  return { pageWidth: s.width, pageHeight: s.height };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像読み込み失敗'));
    img.src = src;
  });
}

/**
 * data:URL を Blob 化 → ObjectURL で Image 読込 → Canvas でリサイズ・JPEG 化。
 * toDataURL 後に Canvas 破棄・ObjectURL revoke・Image 参照解除してメモリを早く解放する。
 */
async function correctImageOrientation(
  dataUrl: string,
  quality: number,
  maxSize: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const blob = await fetch(dataUrl).then((r) => r.blob());
  const objectUrl = URL.createObjectURL(blob);
  let img: HTMLImageElement | null = null;

  try {
    img = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    let ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas取得失敗');

    let w: number;
    let h: number;
    if (img.naturalWidth > maxSize || img.naturalHeight > maxSize) {
      const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
      w = Math.round(img.naturalWidth * scale);
      h = Math.round(img.naturalHeight * scale);
    } else {
      w = img.naturalWidth;
      h = img.naturalHeight;
    }

    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(img, 0, 0, w, h);

    const out = canvas.toDataURL('image/jpeg', quality);
    canvas.width = 0;
    canvas.height = 0;
    ctx = null;

    return { dataUrl: out, width: w, height: h };
  } finally {
    URL.revokeObjectURL(objectUrl);
    img = null;
  }
}

function blobToBase64Data(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const usePdf = () => {
  const generatePdf = async (
    photos: Photo[],
    paperSize: PaperSizeId,
    pdfQuality: PdfQualityId,
    onProgress?: (current: number, total: number) => void,
  ): Promise<Blob> => {
    const quality = PDF_QUALITY_NUM[pdfQuality];
    const maxSize = MAX_SIZE_BY_QUALITY[pdfQuality];
    let pdf: jsPDF | null = null;
    const { pageWidth, pageHeight } = pageDimensionsPortraitMm(paperSize);
    const total = photos.length;

    for (let i = 0; i < total; i++) {
      if (i > 0 && i % 5 === 0) {
        await new Promise<void>((r) => setTimeout(r, 200));
      }

      let jpegDataUrl: string | null = null;
      try {
        const { dataUrl, width: iw, height: ih } = await correctImageOrientation(
          photos[i].dataUrl,
          quality,
          maxSize,
        );
        jpegDataUrl = dataUrl;
        const imgRatio = iw / ih;

        if (i === 0) {
          pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pageWidth, pageHeight],
            compress: true,
          });
        } else {
          pdf!.addPage([pageWidth, pageHeight]);
        }

        const pageRatio = pageWidth / pageHeight;
        let w = pageWidth;
        let h = pageHeight;
        if (imgRatio > pageRatio) {
          h = pageWidth / imgRatio;
        } else {
          w = pageHeight * imgRatio;
        }

        const x = (pageWidth - w) / 2;
        const y = (pageHeight - h) / 2;

        pdf!.addImage(jpegDataUrl, 'JPEG', x, y, w, h);
      } finally {
        jpegDataUrl = null;
      }

      await new Promise<void>((r) => setTimeout(r, 32));
      onProgress?.(i + 1, total);
    }

    return pdf!.output('blob');
  };

  /**
   * 複数PDFをキャッシュに書き込み、ネイティブでは Share.share({ files }) で一括共有。
   * @returns ネイティブで共有シートまで完了したら true
   */
  const savePdfBatch = async (items: { blob: Blob; fileName: string }[]): Promise<boolean> => {
    if (items.length === 0) return false;
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      const uris: string[] = [];
      for (const { blob, fileName } of items) {
        const base64 = await blobToBase64Data(blob);
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64,
          directory: Directory.Cache,
        });
        uris.push(result.uri);
      }

      await Share.share({
        title: 'PDFを共有',
        files: uris,
        dialogTitle: '共有',
      });
      return true;
    }

    for (const { blob, fileName } of items) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
    return false;
  };

  /** @returns ネイティブで共有シートまで完了したら true（Web のダウンロードは false） */
  const savePdf = async (blob: Blob, fileName: string): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      const base64 = await blobToBase64Data(blob);

      const result = await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: fileName,
        url: result.uri,
        dialogTitle: '共有',
      });
      return true;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return false;
  };

  return { generatePdf, savePdf, savePdfBatch };
};
