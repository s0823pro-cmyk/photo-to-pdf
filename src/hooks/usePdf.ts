import { jsPDF } from 'jspdf';
import type { Photo, PaperSizeId, PdfQualityId } from '../types';
import { Capacitor } from '@capacitor/core';

const PDF_QUALITY_NUM: Record<PdfQualityId, number> = {
  high: 0.92,
  medium: 0.7,
  low: 0.45,
};

/** 縦向き基準の用紙幅・高さ（mm）。横向きページでは w/h を入れ替える */
const PAPER_PORTRAIT_MM: Record<PaperSizeId, { w: number; h: number }> = {
  a3: { w: 297, h: 420 },
  a4: { w: 210, h: 297 },
  b5: { w: 182, h: 257 },
};

function pageDimensionsMm(paperSize: PaperSizeId, landscapePage: boolean): { pageWidth: number; pageHeight: number } {
  const { w, h } = PAPER_PORTRAIT_MM[paperSize];
  if (landscapePage) {
    return { pageWidth: h, pageHeight: w };
  }
  return { pageWidth: w, pageHeight: h };
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

function isLandscapePage(photo: Photo, imgRatio: number): boolean {
  const o = photo.orientation;
  if (o === 'portrait') return false;
  if (o === 'landscape') return true;
  return imgRatio > 1;
}

export const usePdf = () => {
  const generatePdf = async (
    photos: Photo[],
    paperSize: PaperSizeId,
    pdfQuality: PdfQualityId,
  ): Promise<Blob> => {
    const quality = PDF_QUALITY_NUM[pdfQuality];
    let pdf: jsPDF | null = null;

    for (let i = 0; i < photos.length; i++) {
      const correctedDataUrl = await correctImageOrientation(photos[i].dataUrl, quality);
      const img = await loadImage(correctedDataUrl);
      const imgRatio = img.width / img.height;
      const landscapePage = isLandscapePage(photos[i], imgRatio);
      const orient = landscapePage ? 'landscape' : 'portrait';
      const { pageWidth, pageHeight } = pageDimensionsMm(paperSize, landscapePage);

      if (i === 0) {
        pdf = new jsPDF({
          orientation: orient,
          unit: 'mm',
          format: [pageWidth, pageHeight],
        });
      } else {
        pdf!.addPage([pageWidth, pageHeight], orient);
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

  const savePdf = async (blob: Blob, fileName: string): Promise<void> => {
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
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return { generatePdf, savePdf };
};
