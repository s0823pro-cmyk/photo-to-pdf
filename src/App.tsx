import { useEffect, useState, useRef, type ChangeEvent } from 'react';
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
import { Capacitor } from '@capacitor/core';
import { type Photo, MAX_FREE_PHOTOS } from './types';
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

function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showPdfNameSheet, setShowPdfNameSheet] = useState(false);
  const [pdfNameDefault, setPdfNameDefault] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [renamePhotoId, setRenamePhotoId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [overDropId, setOverDropId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { isPro, isLoading, purchase, restore, resetPurchase } = usePurchase();
  const { generatePdf, savePdf } = usePdf();
  const { showInterstitial } = useAdMob(isPro);

  const previewPhoto = previewId ? photos.find((p) => p.id === previewId) : undefined;
  const renamePhoto = renamePhotoId ? photos.find((p) => p.id === renamePhotoId) : undefined;
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = isPro ? Infinity : MAX_FREE_PHOTOS - photos.length;
    const toAdd = files.slice(0, remaining);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotos((prev) => [...prev, {
          id: crypto.randomUUID(),
          dataUrl: ev.target?.result as string,
          fileName: file.name,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleCamera = async () => {
    if (!canAddMore) return;
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        ...CAMERA_PROMPT_LABELS,
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

  const handleLibraryPick = async () => {
    if (!canAddMore) return;
    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera } = await import('@capacitor/camera');
        const remaining = isPro ? Infinity : MAX_FREE_PHOTOS - photos.length;
        if (remaining <= 0) return;
        const { photos: picked } = await Camera.pickImages({
          quality: 90,
          limit: isPro ? 0 : remaining,
          correctOrientation: true,
          ...CAMERA_PROMPT_LABELS,
        } as import('@capacitor/camera').GalleryImageOptions);
        const newItems: Photo[] = [];
        let i = 0;
        for (const p of picked) {
          const dataUrl = await webPathToDataUrl(p.webPath);
          newItems.push({
            id: crypto.randomUUID(),
            dataUrl,
            fileName: `写真_${Date.now()}_${i++}.jpg`,
          });
        }
        setPhotos((prev) => {
          if (!isPro) {
            const space = MAX_FREE_PHOTOS - prev.length;
            return [...prev, ...newItems.slice(0, space)];
          }
          return [...prev, ...newItems];
        });
      } catch {
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setIsDone(false);
    setPreviewId((cur) => (cur === id ? null : cur));
  };

  const openPdfNameSheet = () => {
    if (photos.length === 0) return;
    setPdfNameDefault(formatPdfBaseName());
    setShowPdfNameSheet(true);
  };

  const runPdfGeneration = async (baseName: string) => {
    if (photos.length === 0) return;
    setShowPdfNameSheet(false);
    setIsGenerating(true);
    setIsDone(false);
    try {
      const blob = await generatePdf(photos);
      const safe = baseName.replace(/\.pdf$/i, '').trim();
      const fileName = `${safe.length > 0 ? safe : formatPdfBaseName()}.pdf`;
      await savePdf(blob, fileName);
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
      <header className="header">
        <div className="header-left">
          <h1>写真→PDF</h1>
          {isPro && <span className="pro-badge">PRO</span>}
        </div>
        <div className="header-actions">
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

      {!isEmpty && (
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
            onClick={() => void handleLibraryPick()}
          >
            <span className="quick-add-btn-icon" aria-hidden>🗂️</span>
            ライブラリ
          </button>
        </div>
      )}

      {!isPro && !isEmpty && (
        <div className="limit-bar">
          <div className="limit-info">
            <span className="limit-label">使用枚数</span>
            <div className="limit-dots">
              {Array.from({ length: MAX_FREE_PHOTOS }, (_, i) => (
                <div key={i} className={`dot ${i < photos.length ? 'filled' : ''}`} />
              ))}
            </div>
          </div>
          <button type="button" className="pro-btn" disabled={isLoading} onClick={() => setShowProModal(true)}>無制限 ¥500</button>
        </div>
      )}

      {isEmpty ? (
        <div className="empty-state">
          <div className="empty-icon">🖼️</div>
          <p className="empty-title">写真をPDFに変換</p>
          <p className="empty-sub">複数の写真をまとめて<br />1つのPDFファイルに</p>
          <div className="empty-actions">
            <button type="button" className="empty-btn" onClick={handleCamera}>
              <span className="empty-btn-icon">📷</span>
              撮影する
            </button>
            <button type="button" className="empty-btn" onClick={() => void handleLibraryPick()}>
              <span className="empty-btn-icon">🗂️</span>
              ライブラリ
            </button>
          </div>
        </div>
      ) : (
        <>
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
                    onRename={() => setRenamePhotoId(photo.id)}
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

          <div className="actions">
            <button type="button" className="generate-btn" onClick={openPdfNameSheet} disabled={isGenerating}>
              {isGenerating ? 'PDF生成中...' : `PDFを作成 ${photos.length}枚 →`}
            </button>
            <div className="sub-actions">
              <button type="button" className="reset-btn" onClick={handleReset}>リセット</button>
            </div>
            {isDone && <p className="done-msg">✅ PDFを保存しました！</p>}
          </div>
        </>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="file-input-hidden" onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />

      {showPdfNameSheet && (
        <PdfNameSheet
          defaultBaseName={pdfNameDefault}
          onCancel={() => setShowPdfNameSheet(false)}
          onConfirm={(name) => void runPdfGeneration(name)}
        />
      )}

      {renamePhoto && (
        <RenamePhotoSheet
          initialName={renamePhoto.fileName}
          onCancel={() => setRenamePhotoId(null)}
          onConfirm={(name) => {
            setPhotos((prev) =>
              prev.map((p) => (p.id === renamePhoto.id ? { ...p, fileName: name } : p)),
            );
            setRenamePhotoId(null);
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
        />
      )}
    </div>
  );
}

export default App;
