import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { Capacitor } from '@capacitor/core';
import { type Photo, MAX_FREE_PHOTOS } from './types';
import { SettingsModal } from './components/SettingsModal';
import { PdfNameSheet } from './components/PdfNameSheet';
import { PhotoPreviewModal } from './components/PhotoPreviewModal';
import { useAdMob } from './hooks/useAdMob';
import { usePurchase } from './hooks/usePurchase';
import { usePdf } from './hooks/usePdf';
import { CAMERA_PROMPT_LABELS, webPathToDataUrl } from './lib/cameraHelpers';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { isPro, isLoading, purchase, restore, resetPurchase } = usePurchase();
  const { generatePdf, savePdf } = usePdf();
  const { showInterstitial } = useAdMob(isPro);

  const previewPhoto = previewId ? photos.find((p) => p.id === previewId) : undefined;

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
        });
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

  const movePhoto = (index: number, dir: 'up' | 'down') => {
    const next = [...photos];
    const swap = dir === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setPhotos(next);
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
            {photos.map((photo, i) => (
              <div key={photo.id} className="photo-card">
                <div className="photo-thumb-wrap">
                  <button
                    type="button"
                    className="photo-thumb-btn"
                    onClick={() => setPreviewId(photo.id)}
                    aria-label={`${photo.fileName}を拡大表示`}
                  >
                    <img src={photo.dataUrl} alt="" />
                  </button>
                  <div className="photo-overlay">
                    <button type="button" className="overlay-btn" onClick={() => removePhoto(photo.id)} aria-label="削除">✕</button>
                  </div>
                </div>
                <div className="photo-footer">
                  <div className="photo-order">
                    <button type="button" className="order-btn" onClick={() => movePhoto(i, 'up')} disabled={i === 0} aria-label="上へ">↑</button>
                    <span className="order-num">{i + 1}</span>
                    <button type="button" className="order-btn" onClick={() => movePhoto(i, 'down')} disabled={i === photos.length - 1} aria-label="下へ">↓</button>
                  </div>
                </div>
              </div>
            ))}

            {canAddMore ? (
              <div className="add-buttons">
                <div
                  className="add-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleCamera()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void handleCamera();
                    }
                  }}
                >
                  <div className="add-icon">📷</div>
                  <span className="add-label">撮影</span>
                  <span className="add-sublabel">カメラを起動</span>
                </div>
                <div
                  className="add-card"
                  role="button"
                  tabIndex={0}
                  onClick={() => void handleLibraryPick()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void handleLibraryPick();
                    }
                  }}
                >
                  <div className="add-icon">🗂️</div>
                  <span className="add-label">ライブラリ</span>
                  <span className="add-sublabel">複数選択OK</span>
                </div>
              </div>
            ) : (
              <div
                className={`limit-card${isLoading ? ' limit-card--busy' : ''}`}
                role="button"
                tabIndex={isLoading ? -1 : 0}
                onClick={() => setShowProModal(true)}
                onKeyDown={(e) => {
                  if (isLoading) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowProModal(true);
                  }
                }}
              >
                <div className="lock-icon">🔒</div>
                <span className="limit-card-label">5枚まで（無料）</span>
                <span className="limit-card-sub">タップで無制限に</span>
              </div>
            )}
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
