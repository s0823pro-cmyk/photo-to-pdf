import { useEffect, useId, useState, type FormEvent } from 'react';

interface Props {
  defaultBaseName: string;
  onConfirm: (baseName: string) => void;
  onCancel: () => void;
}

export function PdfNameSheet({ defaultBaseName, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const [value, setValue] = useState(defaultBaseName);

  useEffect(() => {
    setValue(defaultBaseName);
  }, [defaultBaseName]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    onConfirm(trimmed.length > 0 ? trimmed : defaultBaseName);
  };

  return (
    <div className="sheet-overlay sheet-overlay--pdf" role="presentation" onClick={onCancel}>
      <div
        className="pdf-name-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden />
        <h2 id={titleId} className="pdf-name-sheet__title">
          PDFのファイル名
        </h2>
        <p className="pdf-name-sheet__hint">保存時に .pdf が付きます</p>
        <form onSubmit={handleSubmit} className="pdf-name-sheet__form">
          <input
            type="text"
            className="pdf-name-sheet__input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            autoFocus
            enterKeyHint="done"
            placeholder={defaultBaseName}
          />
          <div className="pdf-name-sheet__actions">
            <button type="button" className="pdf-name-sheet__btn pdf-name-sheet__btn--secondary" onClick={onCancel}>
              キャンセル
            </button>
            <button type="submit" className="pdf-name-sheet__btn pdf-name-sheet__btn--primary">
              作成する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
