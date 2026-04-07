import * as pdfjsLib from 'pdfjs-dist';
import type { Photo } from '../types';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let workerConfigured = false;

function ensureWorker() {
  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    workerConfigured = true;
  }
}

/** PDF を最大 maxPages ページまで画像化して Photo 配列にする（各ページ1枚） */
export async function pdfFileToPhotos(
  data: ArrayBuffer,
  sourceFileName: string,
  maxPages: number,
): Promise<Photo[]> {
  ensureWorker();
  const base = sourceFileName.replace(/\.pdf$/i, '') || 'document';
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
  const pdf = await loadingTask.promise;
  const total = pdf.numPages;
  const count = Math.min(total, Math.max(0, maxPages));
  const out: Photo[] = [];

  for (let p = 1; p <= count; p++) {
    const page = await pdf.getPage(p);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    out.push({
      id: crypto.randomUUID(),
      dataUrl,
      fileName: `${base} (${p}/${total}).jpg`,
    });
  }

  return out;
}
