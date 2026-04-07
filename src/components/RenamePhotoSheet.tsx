import { useEffect, useId, useState, type FormEvent } from 'react';

interface Props {
  initialName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function RenamePhotoSheet({ initialName, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const [value, setValue] = useState(initialName);

  useEffect(() => {
    setValue(initialName);
  }, [initialName]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = value.trim();
    onConfirm(t.length > 0 ? t : initialName);
  };

  return (
    <div className="sheet-overlay sheet-overlay--rename" role="presentation" onClick={onCancel}>
      <div
        className="rename-photo-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden />
        <h2 id={titleId} className="rename-photo-sheet__title">
          ファイル名を編集
        </h2>
        <form onSubmit={handleSubmit} className="rename-photo-sheet__form">
          <input
            type="text"
            className="rename-photo-sheet__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoFocus
            enterKeyHint="done"
          />
          <div className="rename-photo-sheet__actions">
            <button type="button" className="rename-photo-sheet__btn rename-photo-sheet__btn--secondary" onClick={onCancel}>
              キャンセル
            </button>
            <button type="submit" className="rename-photo-sheet__btn rename-photo-sheet__btn--primary">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
