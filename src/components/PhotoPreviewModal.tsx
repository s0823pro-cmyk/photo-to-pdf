import { useEffect, useRef } from 'react';
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

const RESET_DURATION_MS = 0;

interface Props {
  dataUrl: string;
  fileName: string;
  onClose: () => void;
}

export function PhotoPreviewModal({ dataUrl, fileName, onClose }: Props) {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      transformRef.current?.resetTransform(RESET_DURATION_MS);
    });
    return () => cancelAnimationFrame(id);
  }, [dataUrl]);

  return (
    <div
      className="preview-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={fileName}
      onClick={onClose}
    >
      <div
        className="preview-stage"
        role="presentation"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="preview-zoom-host"
          role="presentation"
          onClick={(e) => e.stopPropagation()}
        >
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

      <p className="preview-caption">ピンチで拡大 · ダブルタップでリセット</p>
    </div>
  );
}
