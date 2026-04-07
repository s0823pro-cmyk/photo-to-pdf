import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Photo } from '../types';
import { truncateFileName } from '../lib/formatFilename';

interface Props {
  photo: Photo;
  index: number;
  isDropTarget: boolean;
  onPreview: () => void;
  onRemove: () => void;
  onRename: () => void;
}

export function SortablePhotoCard({
  photo,
  index,
  isDropTarget,
  onPreview,
  onRemove,
  onRename,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const displayName = truncateFileName(photo.fileName, 15);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`photo-card ${isDragging ? 'photo-card--dragging' : ''} ${isDropTarget ? 'photo-card--drop-target' : ''}`}
    >
      <span className="photo-num-badge" aria-hidden>
        {index + 1}
      </span>

      <div className="photo-thumb-wrap">
        <button
          type="button"
          className="photo-filename-overlay"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
          aria-label={`ファイル名を編集: ${photo.fileName}`}
        >
          {displayName}
        </button>

        <button
          type="button"
          className="photo-thumb-btn"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          aria-label={`${photo.fileName}を拡大表示`}
        >
          <img src={photo.dataUrl} alt="" draggable={false} />
        </button>

        <div className="photo-overlay">
          <button
            type="button"
            className="overlay-btn"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            aria-label="削除"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
