import { jsPDF } from 'jspdf';
import type { Photo, PaperSizeId, PdfQualityId } from '../types';
import { Capacitor } from '@capacitor/core';

const PDF_QUALITY_NUM: Record<PdfQualityId, number> = {
  high: 0.92,
  medium: 0.7,
  low: 0.45,
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

const correctImageOrientation = (dataUrl: string, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas取得失敗'));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('画像読み込み失敗'));
    img.src = dataUrl;
  });
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像読み込み失敗'));
    img.src = src;
  });
}

export const usePdf = () => {
  const generatePdf = async (
    photos: Photo[],
    paperSize: PaperSizeId,
    pdfQuality: PdfQualityId,
  ): Promise<Blob> => {
    const quality = PDF_QUALITY_NUM[pdfQuality];
    let pdf: jsPDF | null = null;
    const { pageWidth, pageHeight } = pageDimensionsPortraitMm(paperSize);

    for (let i = 0; i < photos.length; i++) {
      const correctedDataUrl = await correctImageOrientation(photos[i].dataUrl, quality);
      const img = await loadImage(correctedDataUrl);
      const imgRatio = img.naturalWidth / img.naturalHeight;

      if (i === 0) {
        pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [pageWidth, pageHeight],
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

      const format = correctedDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      pdf!.addImage(correctedDataUrl, format, x, y, w, h);
    }

    return pdf!.output('blob');
  };

  /** @returns ネイティブで共有シートまで完了したら true（Web のダウンロードは false） */
  const savePdf = async (blob: Blob, fileName: string): Promise<boolean> => {
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

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

  return { generatePdf, savePdf };
};
