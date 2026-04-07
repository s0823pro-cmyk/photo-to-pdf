import { TransformComponent, TransformWrapper } from 'react-zoom-pan-pinch';

interface Props {
  dataUrl: string;
  fileName: string;
  onClose: () => void;
}

export function PhotoPreviewModal({ dataUrl, fileName, onClose }: Props) {
  return (
    <div className="preview-overlay" role="presentation" onClick={onClose}>
      <div className="preview-toolbar" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="preview-close-btn" onClick={onClose}>
          閉じる
        </button>
      </div>
      <div className="preview-stage" role="presentation" onClick={onClose}>
        <div
          className="preview-zoom-host"
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <TransformWrapper
            initialScale={1}
            minScale={0.6}
            maxScale={4}
            centerOnInit
            doubleClick={{ mode: 'reset' }}
          >
            <TransformComponent
              wrapperClass="preview-transform-wrapper"
              contentClass="preview-transform-content"
            >
              <img src={dataUrl} alt={fileName} className="preview-img" draggable={false} />
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>
      <p className="preview-caption" aria-hidden onClick={onClose}>
        ピンチで拡大 · ダブルタップでリセット
      </p>
    </div>
  );
}
