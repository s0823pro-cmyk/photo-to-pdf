import { jsPDF } from 'jspdf';
import type { Photo } from '../types';

export const usePdf = () => {
  const generatePdf = async (photos: Photo[]): Promise<Blob> => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;

    for (let i = 0; i < photos.length; i++) {
      if (i > 0) pdf.addPage();

      const img = new Image();
      img.src = photos[i].dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
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

      const format = photos[i].dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(photos[i].dataUrl, format, x, y, w, h);
    }

    return pdf.output('blob');
  };

  const downloadPdf = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { generatePdf, downloadPdf };
};
