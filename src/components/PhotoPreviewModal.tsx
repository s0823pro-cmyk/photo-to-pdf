import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';
import type { PhotoPageOrientation } from '../types';

interface Props {
  dataUrl: string;
  fileName: string;
  orientation: PhotoPageOrientation | undefined;
  onClose: () => void;
  onOrientationChange: (mode: PhotoPageOrientation) => void;
}

type SegmentMode = 'auto' | 'portrait' | 'landscape';

function toSegment(orientation: PhotoPageOrientation | undefined): SegmentMode {
  if (orientation === 'portrait' || orientation === 'landscape') return orientation;
  return 'auto';
}

export function PhotoPreviewModal({
  dataUrl,
  fileName,
  orientation,
  onClose,
  onOrientationChange,
}: Props) {
  const segment = toSegment(orientation);

  const pickSegment = (mode: SegmentMode) => {
    if (mode === 'auto') onOrientationChange('auto');
    else onOrientationChange(mode);
  };

  return (
    <div className="preview-overlay" role="dialog" aria-modal="true" aria-label={fileName}>
      <div className="preview-stage" role="presentation">
        <div className="preview-zoom-host" role="presentation">
          <TransformWrapper
            initialScale={1}
            minScale={0.6}
            maxScale={4}
            centerOnInit
            limitToBounds
            doubleClick={{ mode: 'reset' }}
            wheel={{ disabled: true }}
            panning={{ disabled: true }}
            pinch={{ disabled: false }}
          >
            <TransformComponent
              wrapperClass="preview-transform-wrapper"
              contentClass="preview-transform-content"
            >
              <img
                src={dataUrl}
                alt={fileName}
                className="preview-img"
                draggable={false}
              />
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>

      <p className="preview-caption">ピンチで拡大 · ダブルタップでリセット</p>

      <div className="preview-bottom-dock">
        <div className="preview-orientation-segment" role="group" aria-label="ページの向き">
          <button
            type="button"
            className={`preview-segment-btn${segment === 'auto' ? ' preview-segment-btn--active' : ''}`}
            onClick={() => pickSegment('auto')}
          >
            自動
          </button>
          <button
            type="button"
            className={`preview-segment-btn${segment === 'portrait' ? ' preview-segment-btn--active' : ''}`}
            onClick={() => pickSegment('portrait')}
          >
            縦
          </button>
          <button
            type="button"
            className={`preview-segment-btn${segment === 'landscape' ? ' preview-segment-btn--active' : ''}`}
            onClick={() => pickSegment('landscape')}
          >
            横
          </button>
        </div>

        <button type="button" className="preview-close-btn-bottom" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
}
