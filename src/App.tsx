import { useEffect, useState, useRef, type ChangeEvent } from 'react';
import { type Photo, MAX_FREE_PHOTOS } from './types';
import { ProModal } from './components/ProModal';
import { useAdMob } from './hooks/useAdMob';
import { usePurchase } from './hooks/usePurchase';
import { usePdf } from './hooks/usePdf';
import './App.css';

function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { isPro, isLoading, purchase, restore, resetPurchase } = usePurchase();
  const { generatePdf, downloadPdf } = usePdf();
  const { showInterstitial } = useAdMob(isPro);

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

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setIsDone(false);
  };

  const movePhoto = (index: number, dir: 'up' | 'down') => {
    const next = [...photos];
    const swap = dir === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setPhotos(next);
  };

  const handleGenerate = async () => {
    if (photos.length === 0) return;
    setIsGenerating(true);
    setIsDone(false);
    try {
      const blob = await generatePdf(photos);
      const now = new Date();
      const fileName = `写真PDF_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}.pdf`;
      downloadPdf(blob, fileName);
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
            <button type="button" className="empty-btn" onClick={() => fileInputRef.current?.click()}>
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
                <img src={photo.dataUrl} alt={photo.fileName} />
                <div className="photo-overlay">
                  <button type="button" className="overlay-btn" onClick={() => removePhoto(photo.id)}>✕</button>
                </div>
                <div className="photo-footer">
                  <div className="photo-order">
                    <button type="button" className="order-btn" onClick={() => movePhoto(i, 'up')} disabled={i === 0}>↑</button>
                    <span className="order-num">{i + 1}</span>
                    <button type="button" className="order-btn" onClick={() => movePhoto(i, 'down')} disabled={i === photos.length - 1}>↓</button>
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
                  onClick={handleCamera}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCamera();
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
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
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
            <button type="button" className="generate-btn" onClick={handleGenerate} disabled={isGenerating}>
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

      {showProModal && (
        <ProModal
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
