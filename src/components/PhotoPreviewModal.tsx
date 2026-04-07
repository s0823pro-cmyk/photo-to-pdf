import { useEffect, useRef } from 'react';
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import type { Photo } from '../types';

const RESET_DURATION_MS = 0;

interface Props {
  photo: Photo;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function PhotoPreviewModal({
  photo,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
}: Props) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const { dataUrl, fileName } = photo;

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      transformRef.current?.resetTransform(RESET_DURATION_MS);
    });
    return () => cancelAnimationFrame(id);
  }, [dataUrl]);

  return (
    <div className="preview-overlay" role="dialog" aria-modal="true" aria-label={fileName}>
      <button type="button" className="preview-back-btn" onClick={onClose} aria-label="戻る">
        ‹ 戻る
      </button>

      <button
        type="button"
        className="preview-nav-btn preview-nav-btn--prev"
        onClick={() => onPrev?.()}
        style={{ visibility: hasPrev ? 'visible' : 'hidden' }}
        aria-label="前の写真"
      >
        ◁
      </button>
      <button
        type="button"
        className="preview-nav-btn preview-nav-btn--next"
        onClick={() => onNext?.()}
        style={{ visibility: hasNext ? 'visible' : 'hidden' }}
        aria-label="次の写真"
      >
        ▷
      </button>

      <div className="preview-stage" role="presentation">
        <div className="preview-zoom-host" role="presentation">
          <TransformWrapper
            ref={transformRef}
            initialScale={1}
            minScale={1}
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
    </div>
  );
}
