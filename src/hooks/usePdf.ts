import { jsPDF } from 'jspdf';
import type { Photo } from '../types';
import { Capacitor } from '@capacitor/core';

const correctImageOrientation = (dataUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas取得失敗'));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => reject(new Error('画像読み込み失敗'));
    img.src = dataUrl;
  });
};

export const usePdf = () => {
  const generatePdf = async (photos: Photo[]): Promise<Blob> => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;

    for (let i = 0; i < photos.length; i++) {
      if (i > 0) pdf.addPage();

      const correctedDataUrl = await correctImageOrientation(photos[i].dataUrl);

      const img = new Image();
      img.src = correctedDataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('画像読み込み失敗'));
      });

      const imgRatio = img.width / img.height;
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
      pdf.addImage(correctedDataUrl, format, x, y, w, h);
    }

    return pdf.output('blob');
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
