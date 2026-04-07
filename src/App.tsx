import { useEffect, useState, useRef, useCallback, type ChangeEvent } from 'react';
import { Capacitor } from '@capacitor/core';
import type { GalleryImageOptions } from '@capacitor/camera';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable';
import { type Photo, type PaperSizeId, type PdfQualityId, MAX_FREE_PHOTOS } from './types';
import { SettingsModal } from './components/SettingsModal';
import { PdfNameSheet } from './components/PdfNameSheet';
import { PhotoPreviewModal } from './components/PhotoPreviewModal';
import { SortablePhotoCard } from './components/SortablePhotoCard';
import { RenamePhotoSheet } from './components/RenamePhotoSheet';
import { useAdMob } from './hooks/useAdMob';
import { usePurchase } from './hooks/usePurchase';
import { usePdf } from './hooks/usePdf';
import { CAMERA_PROMPT_LABELS, webPathToDataUrl } from './lib/cameraHelpers';
import { truncateFileName } from './lib/formatFilename';
import './App.css';

function formatPdfBaseName(d = new Date()): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `写真PDF_${y}${mo}${day}_${h}${m}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('読み込み失敗'));
    r.readAsDataURL(file);
  });
}

/** Photo.fileName を PDF 保存名に（拡張子のみ .pdf へ、なければ末尾に .pdf） */
function loadPaperSize(): PaperSizeId {
  try {
    const v = localStorage.getItem('paperSize');
    if (v === 'a3' || v === 'a4' || v === 'b5') return v;
  } catch {
    /* ignore */
  }
  return 'a4';
}

function loadPdfQuality(): PdfQualityId {
  try {
    const v = localStorage.getItem('pdfQuality');
    if (v === 'high' || v === 'medium' || v === 'low') return v;
  } catch {
    /* ignore */
  }
  return 'high';
}

function fileNameToPdfOutputName(fileName: string): string {
  const t = fileName.trim() || 'export';
  if (/\.pdf$/i.test(t)) return t;
  const replaced = t.replace(/\.[^./\\]+$/i, '.pdf');
  if (replaced !== t) return replaced;
  return `${t}.pdf`;
}

function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showPdfNameSheet, setShowPdfNameSheet] = useState(false);
  const [pdfNameDefault, setPdfNameDefault] = useState('');
  const [pdfSheetNonce, setPdfSheetNonce] = useState(0);
  const [showRenameSheet, setShowRenameSheet] = useState(false);
  const [renamePhotoId, setRenamePhotoId] = useState<string | null>(null);
  const [pdfMergeMode, setPdfMergeMode] = useState<'merge' | 'individual'>('merge');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);
  const libraryImageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  const isPickingRef = useRef(false);
  const libraryPickFocusHandlerRef = useRef<(() => void) | null>(null);
  const { isPro, isLoading, purchase, restore, resetPurchase } = usePurchase();
  const { generatePdf, savePdf } = usePdf();
  const { showInterstitial } = useAdMob(isPro);

  const [paperSize, setPaperSize] = useState<PaperSizeId>('a4');
  const [pdfQuality, setPdfQuality] = useState<PdfQualityId>(loadPdfQuality);

  useEffect(() => {
    const stored = loadPaperSize();
    if (isPro) {
      setPaperSize(stored);
    } else if (stored === 'a3' || stored === 'b5') {
      setPaperSize('a4');
    } else {
      setPaperSize(stored);
    }
  }, [isPro]);

  useEffect(() => {
    try {
      localStorage.setItem('paperSize', paperSize);
    } catch {
      /* ignore */
    }
  }, [paperSize]);

  useEffect(() => {
    try {
      localStorage.setItem('pdfQuality', pdfQuality);
    } catch {
      /* ignore */
    }
  }, [pdfQuality]);

  const effectivePaperSize: PaperSizeId =
    !isPro && (paperSize === 'a3' || paperSize === 'b5') ? 'a4' : paperSize;

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const previewPhoto = previewId ? photos.find((p) => p.id === previewId) : undefined;
  const renamePhoto = showRenameSheet && renamePhotoId ? photos.find((p) => p.id === renamePhotoId) : undefined;
  const activeDragPhoto = activeDragId ? photos.find((p) => p.id === activeDragId) : undefined;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 450,
        tolerance: 10,
      },
    }),
  );

  const photoIds = photos.map((p) => p.id);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverDropId((event.over?.id as string) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setOverDropId(null);
    if (!over || active.id === over.id) return;
    setPhotos((items) => {
      const oldIndex = items.findIndex((p) => p.id === active.id);
      const newIndex = items.findIndex((p) => p.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setOverDropId(null);
  };

  useEffect(() => {
    if (isPro) setShowProModal(false);
  }, [isPro]);

  const handlePurchase = async () => {
    await purchase();
    setShowProModal(false);
  };

  const handleRestore = async () => {
    await restore();
    setShowProModal(false);
  };

  const canAddMore = isPro || photos.length < MAX_FREE_PHOTOS;

  const mergePhotosIntoState = useCallback((additions: Photo[]) => {
    if (additions.length === 0) return;
    setPhotos((prev) => {
      const cap = isPro ? Infinity : MAX_FREE_PHOTOS;
      const room = cap - prev.length;
      return [...prev, ...additions.slice(0, room)];
    });
  }, [isPro]);

  const handleLibraryImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    libraryPickFocusHandlerRef.current?.();
    libraryPickFocusHandlerRef.current = null;
    isPickingRef.current = false;

    const input = e.target;
    const fileList = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!fileList.length) return;

    let remaining = isPro ? Infinity : MAX_FREE_PHOTOS - photosRef.current.length;
    const additions: Photo[] = [];

    try {
      for (const file of fileList) {
        if (remaining <= 0) break;
        if (!file.type.startsWith('image/')) continue;
        const dataUrl = await readFileAsDataUrl(file);
        additions.push({
          id: crypto.randomUUID(),
          dataUrl,
          fileName: file.name,
        });
        remaining -= 1;
      }
      mergePhotosIntoState(additions);
    } catch {
      alert('ファイルの取り込みに失敗しました。');
    }
  };

  const handlePdfFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const fileList = input.files ? Array.from(input.files) : [];
    input.value = '';
    if (!fileList.length) return;

    let remaining = isPro ? Infinity : MAX_FREE_PHOTOS - photosRef.current.length;
    const additions: Photo[] = [];

    try {
      for (const file of fileList) {
        if (remaining <= 0) break;
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (!isPdf) continue;
        const { pdfFileToPhotos } = await import('./lib/pdfToPhotos');
        const buf = await file.arrayBuffer();
        const maxPages = remaining === Infinity ? 999 : remaining;
        const pages = await pdfFileToPhotos(buf, file.name, maxPages);
        additions.push(...pages);
        remaining -= pages.length;
      }
      mergePhotosIntoState(additions);
    } catch {
      alert('PDFの取り込みに失敗しました。');
    }
  };

  const pickImagesFromNative = useCallback(async () => {
    if (!canAddMore || isPickingRef.current) return;
    const cap = isPro ? Infinity : MAX_FREE_PHOTOS;
    const room = cap - photosRef.current.length;
    if (room <= 0) return;

    isPickingRef.current = true;
    try {
      const { Camera } = await import('@capacitor/camera');
      const limit = room === Infinity ? 0 : room;
      const { photos: galleryPhotos } = await Camera.pickImages({
        quality: 90,
        limit,
        ...CAMERA_PROMPT_LABELS,
      } as GalleryImageOptions);

      const additions: Photo[] = [];
      let remaining = room;
      for (let i = 0; i < galleryPhotos.length && remaining > 0; i++) {
        const gp = galleryPhotos[i];
        const dataUrl = await webPathToDataUrl(gp.webPath);
        const name =
          (gp.path && gp.path.split(/[/\\]/).pop()) || `image_${Date.now()}_${i}.jpg`;
        additions.push({
          id: crypto.randomUUID(),
          dataUrl,
          fileName: name,
        });
        remaining -= 1;
      }
      mergePhotosIntoState(additions);
    } catch {
      /* キャンセル含む */
    } finally {
      isPickingRef.current = false;
    }
  }, [canAddMore, isPro, mergePhotosIntoState]);

  const handleCamera = async () => {
    if (!canAddMore) return;
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false,
      });
      const dataUrl = image.dataUrl;
      if (dataUrl) {
        setPhotos((prev) => {
          if (!isPro && prev.length >= MAX_FREE_PHOTOS) return prev;
          return [...prev, {
            id: crypto.randomUUID(),
            dataUrl,
            fileName: `photo_${Date.now()}.jpg`,
          }];
        });
      }
    } catch {
      cameraInputRef.current?.click();
    }
  };

  const handleLibraryPick = () => {
    if (!canAddMore || isPickingRef.current) return;
    if (Capacitor.isNativePlatform()) {
      void pickImagesFromNative();
      return;
    }
    isPickingRef.current = true;
    const onWinFocus = () => {
      libraryPickFocusHandlerRef.current = null;
      window.setTimeout(() => {
        isPickingRef.current = false;
      }, 350);
    };
    libraryPickFocusHandlerRef.current = () => {
      window.removeEventListener('focus', onWinFocus);
      libraryPickFocusHandlerRef.current = null;
    };
    window.addEventListener('focus', onWinFocus, { once: true });
    libraryImageInputRef.current?.click();
  };

  const handlePdfPick = () => {
    if (!canAddMore) return;
    pdfInputRef.current?.click();
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setIsDone(false);
    setPreviewId((cur) => (cur === id ? null : cur));
    if (renamePhotoId === id) {
      setShowRenameSheet(false);
      setRenamePhotoId(null);
    }
  };

  const openPdfNameSheet = () => {
    if (photos.length === 0) return;
    setShowRenameSheet(false);
    setRenamePhotoId(null);
    setPdfNameDefault(formatPdfBaseName());
    setPdfSheetNonce((n) => n + 1);
    setShowPdfNameSheet(true);
  };

  const onCreatePdfClick = () => {
    if (photos.length === 0 || isGenerating) return;
    if (pdfMergeMode === 'individual') {
      void runIndividualPdfGeneration();
      return;
    }
    openPdfNameSheet();
  };

  const closeRenameSheet = () => {
    setShowRenameSheet(false);
    setRenamePhotoId(null);
  };

  const runPdfGeneration = async (baseName: string) => {
    if (photos.length === 0) return;
    setShowPdfNameSheet(false);
    setIsGenerating(true);
    setIsDone(false);
    try {
      const safe = baseName.replace(/\.pdf$/i, '').trim();
      const stem = safe.length > 0 ? safe : formatPdfBaseName();
      const list = [...photos];
      const blob = await generatePdf(list, effectivePaperSize, pdfQuality);
      await savePdf(blob, `${stem}.pdf`);
      setIsDone(true);
      await showInterstitial();
    } catch {
      alert('PDF生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const runIndividualPdfGeneration = async () => {
    if (photos.length === 0) return;
    setShowPdfNameSheet(false);
    setShowRenameSheet(false);
    setRenamePhotoId(null);
    setIsGenerating(true);
    setIsDone(false);
    try {
      const list = [...photos];
      for (let i = 0; i < list.length; i++) {
        const blob = await generatePdf([list[i]], effectivePaperSize, pdfQuality);
        await savePdf(blob, fileNameToPdfOutputName(list[i].fileName));
      }
      setIsDone(true);
      await showInterstitial();
    } catch {
      alert('PDF生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setPhotos([]);
    setIsDone(false);
    setPreviewId(null);
  };

  const isEmpty = photos.length === 0;

  return (
    <div className="app">
      <div className="sticky-header-cluster">
        <header className="header">
          <div className="header-left">
            <h1>写真→PDF</h1>
            {isPro && <span className="pro-badge">PRO</span>}
          </div>
          <div className="header-actions">
            {!isEmpty && (
              <button type="button" className="reset-btn reset-btn--header" onClick={handleReset}>
                リセット
              </button>
            )}
            {isPro && (
              <button
                type="button"
                className="restore-link"
                disabled={isLoading}
                onClick={() => {
                  if (confirm('購入状態をリセットしますか？（無料プランに戻ります）')) {
                    resetPurchase();
                  }
                }}
              >
                購入をリセット
              </button>
            )}
            <button
              type="button"
              className="settings-btn"
              disabled={isLoading}
              onClick={() => setShowProModal(true)}
              aria-label="設定"
              title="設定"
            >
              ⚙️
            </button>
          </div>
        </header>

        <div className="quick-add-bar">
          <button
            type="button"
            className="quick-add-btn"
            disabled={!canAddMore || isLoading}
            onClick={() => void handleCamera()}
          >
            <span className="quick-add-btn-icon" aria-hidden>📷</span>
            撮影
          </button>
          <button
            type="button"
            className="quick-add-btn"
            disabled={!canAddMore || isLoading}
            onClick={handleLibraryPick}
          >
            <span className="quick-add-btn-icon" aria-hidden>🗂️</span>
            ライブラリ
          </button>
          <button
            type="button"
            className="quick-add-btn"
            disabled={!canAddMore || isLoading}
            onClick={handlePdfPick}
          >
            <span className="quick-add-btn-icon" aria-hidden>📄</span>
            PDF
          </button>
        </div>

        {!isPro && (
          <div className="limit-bar">
            <div className="limit-info">
              <span className="limit-label">使用枚数</span>
              <div className="limit-dots">
                {Array.from({ length: MAX_FREE_PHOTOS }, (_, i) => (
                  <div key={i} className={`dot ${i < photos.length ? 'filled' : ''}`} />
                ))}
              </div>
            </div>
            <button type="button" className="pro-btn" disabled={isLoading} onClick={() => setShowProModal(true)}>
              無制限 ¥500
            </button>
          </div>
        )}

        {!isEmpty && (
          <div className="pdf-toolbar">
            <div className="actions-main">
              <div className="pdf-mode-toggle" role="group" aria-label="PDFの作成方法">
                <button
                  type="button"
                  className={`pdf-mode-toggle__btn${pdfMergeMode === 'individual' ? ' pdf-mode-toggle__btn--active' : ''}`}
                  onClick={() => setPdfMergeMode('individual')}
                >
                  個別
                </button>
                <button
                  type="button"
                  className={`pdf-mode-toggle__btn${pdfMergeMode === 'merge' ? ' pdf-mode-toggle__btn--active' : ''}`}
                  onClick={() => setPdfMergeMode('merge')}
                >
                  まとめ
                </button>
              </div>
              <button type="button" className="generate-btn" onClick={onCreatePdfClick} disabled={isGenerating}>
                {isGenerating ? 'PDF生成中...' : `PDFを作成 ${photos.length}枚 →`}
              </button>
            </div>
            {isDone && <p className="done-msg">✅ PDFを保存しました！</p>}
          </div>
        )}
      </div>

      <div className="photo-grid-scroll">
        <div className="photo-grid-wrap">
          {isEmpty ? (
            <p className="photo-grid-hint">撮影・ライブラリ（写真）・PDFボタンから追加してください</p>
          ) : (
            <div className="photo-grid">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext items={photoIds} strategy={rectSortingStrategy}>
                  {photos.map((photo, i) => (
                    <SortablePhotoCard
                      key={photo.id}
                      photo={photo}
                      index={i}
                      isDropTarget={
                        Boolean(activeDragId && overDropId === photo.id && activeDragId !== photo.id)
                      }
                      onPreview={() => setPreviewId(photo.id)}
                      onRemove={() => removePhoto(photo.id)}
                      onRename={() => {
                        setShowPdfNameSheet(false);
                        setRenamePhotoId(photo.id);
                        setShowRenameSheet(true);
                      }}
                    />
                  ))}
                </SortableContext>
                <DragOverlay adjustScale={false}>
                  {activeDragPhoto ? (
                    <div className="photo-card photo-card--overlay-clone">
                      <span className="photo-num-badge" aria-hidden>
                        {photos.findIndex((p) => p.id === activeDragPhoto.id) + 1}
                      </span>
                      <div className="photo-thumb-wrap">
                        <div className="photo-filename-overlay photo-filename-overlay--static">
                          {truncateFileName(activeDragPhoto.fileName, 15)}
                        </div>
                        <div className="photo-thumb-btn photo-thumb-btn--static">
                          <img src={activeDragPhoto.dataUrl} alt="" draggable={false} />
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          )}
        </div>
      </div>

      <input
        ref={libraryImageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="file-input-hidden"
        onChange={(e) => void handleLibraryImageChange(e)}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="file-input-hidden"
        onChange={(e) => void handlePdfFileChange(e)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => void handleLibraryImageChange(e)}
      />

      {showPdfNameSheet && (
        <PdfNameSheet
          key={pdfSheetNonce}
          defaultBaseName={pdfNameDefault}
          onCancel={() => setShowPdfNameSheet(false)}
          onConfirm={(name) => void runPdfGeneration(name)}
        />
      )}

      {showRenameSheet && renamePhoto && (
        <RenamePhotoSheet
          key={renamePhoto.id}
          initialName={renamePhoto.fileName}
          onCancel={closeRenameSheet}
          onConfirm={(name) => {
            setPhotos((prev) =>
              prev.map((p) => (p.id === renamePhoto.id ? { ...p, fileName: name } : p)),
            );
            closeRenameSheet();
          }}
        />
      )}

      {previewPhoto && (
        <PhotoPreviewModal
          dataUrl={previewPhoto.dataUrl}
          fileName={previewPhoto.fileName}
          onClose={() => setPreviewId(null)}
        />
      )}

      {showProModal && (
        <SettingsModal
          onPurchase={handlePurchase}
          onRestore={handleRestore}
          onClose={() => setShowProModal(false)}
          isLoading={isLoading}
          isPro={isPro}
          paperSize={paperSize}
          onPaperSizeChange={setPaperSize}
          pdfQuality={pdfQuality}
          onPdfQualityChange={setPdfQuality}
          onLockedPaperOptionTap={() => {
            document.getElementById('settings-pro-section')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }}
        />
      )}
    </div>
  );
}

export default App;
