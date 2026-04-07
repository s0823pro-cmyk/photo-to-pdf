import { useLayoutEffect, useRef, useState } from 'react';
import type { GridColumns, PaperSizeId, PdfQualityId } from '../types';

interface Props {
  onPurchase: () => void;
  onRestore: () => void;
  onClose: () => void;
  isLoading: boolean;
  isPro: boolean;
  paperSize: PaperSizeId;
  onPaperSizeChange: (id: PaperSizeId) => void;
  pdfQuality: PdfQualityId;
  onPdfQualityChange: (id: PdfQualityId) => void;
  gridColumns: GridColumns;
  onGridColumnsChange: (cols: GridColumns) => void;
}

const GRID_OPTIONS: { id: GridColumns; label: string; proOnly: boolean }[] = [
  { id: '2', label: '2列', proOnly: false },
  { id: '3', label: '3列', proOnly: false },
  { id: '5', label: '5列', proOnly: true },
];

const gridColumnsSummary: Record<GridColumns, string> = {
  '2': '2列',
  '3': '3列',
  '5': '5列',
};

const PAPER_OPTIONS: { id: PaperSizeId; label: string; sub: string; proOnly: boolean }[] = [
  { id: 'a4', label: 'A4', sub: '210 × 297mm', proOnly: false },
  { id: 'a3', label: 'A3', sub: '420 × 297mm', proOnly: true },
  { id: 'b5', label: 'B5', sub: '182 × 257mm', proOnly: true },
];

const QUALITY_OPTIONS: { id: PdfQualityId; label: string; proOnly: boolean }[] = [
  { id: 'high', label: '高', proOnly: false },
  { id: 'medium', label: '中', proOnly: true },
  { id: 'low', label: '低', proOnly: true },
];

const paperDisplay: Record<PaperSizeId, string> = {
  a4: 'A4',
  a3: 'A3',
  b5: 'B5',
};

const qualityDisplay: Record<PdfQualityId, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

type OpenSection = 'display' | 'size' | 'quality' | 'purchase' | null;

export const SettingsModal = ({
  onPurchase,
  onRestore,
  onClose,
  isLoading,
  isPro,
  paperSize,
  onPaperSizeChange,
  pdfQuality,
  onPdfQualityChange,
  gridColumns,
  onGridColumnsChange,
}: Props) => {
  const [openSection, setOpenSection] = useState<OpenSection>(null);
  const scrollPurchaseAfterOpen = useRef(false);

  const toggleSection = (section: 'display' | 'size' | 'quality' | 'purchase') => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const handleLockedTap = () => {
    scrollPurchaseAfterOpen.current = true;
    setOpenSection('purchase');
  };

  useLayoutEffect(() => {
    if (openSection === 'purchase' && scrollPurchaseAfterOpen.current) {
      scrollPurchaseAfterOpen.current = false;
      document.getElementById('settings-pro-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, [openSection]);

  const purchaseSummary = isPro ? '購入済み' : '期間限定 ¥500';

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal modal--settings-scroll"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" aria-hidden />

        <h2 id="settings-modal-title" className="modal-title settings-modal-main-title">
          ⚙️ 設定
        </h2>

        <div className="settings-modal-cells">
          <div className="settings-cell">
            <button
              type="button"
              className="settings-cell-header"
              aria-expanded={openSection === 'display'}
              onClick={() => toggleSection('display')}
            >
              <span className="settings-cell-label">表示設定</span>
              <span className="settings-cell-value">
                <span>{gridColumnsSummary[gridColumns]}</span>
                <span aria-hidden>{openSection === 'display' ? '⌄' : '›'}</span>
              </span>
            </button>
            {openSection === 'display' && (
              <div className="settings-cell-body">
                <div className="settings-choice-row settings-choice-row--in-cell settings-display-cols">
                  {GRID_OPTIONS.map((opt) => {
                    const locked = opt.proOnly && !isPro;
                    const active = gridColumns === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`settings-row-btn settings-row-btn--compact${active ? ' settings-row-btn--active' : ''}${locked ? ' settings-row-btn--locked' : ''}`}
                        onClick={() => {
                          if (locked) {
                            handleLockedTap();
                            return;
                          }
                          onGridColumnsChange(opt.id);
                        }}
                      >
                        {active && <span className="settings-choice-check">✓ </span>}
                        {opt.label}
                        {locked ? ' 🔒' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="settings-cell">
            <button
              type="button"
              className="settings-cell-header"
              aria-expanded={openSection === 'size'}
              onClick={() => toggleSection('size')}
            >
              <span className="settings-cell-label">サイズ設定</span>
              <span className="settings-cell-value">
                <span>{paperDisplay[paperSize]}</span>
                <span aria-hidden>{openSection === 'size' ? '⌄' : '›'}</span>
              </span>
            </button>
            {openSection === 'size' && (
              <div className="settings-cell-body">
                <div className="settings-choice-row settings-choice-row--in-cell">
                  {PAPER_OPTIONS.map((opt) => {
                    const locked = opt.proOnly && !isPro;
                    const active = paperSize === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`settings-row-btn settings-row-btn--compact${active ? ' settings-row-btn--active' : ''}${locked ? ' settings-row-btn--locked' : ''}`}
                        onClick={() => {
                          if (locked) {
                            handleLockedTap();
                            return;
                          }
                          onPaperSizeChange(opt.id);
                        }}
                      >
                        {active && <span className="settings-choice-check">✓ </span>}
                        {opt.label}
                        {locked ? ' 🔒' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="settings-cell">
            <button
              type="button"
              className="settings-cell-header"
              aria-expanded={openSection === 'quality'}
              onClick={() => toggleSection('quality')}
            >
              <span className="settings-cell-label">画質設定</span>
              <span className="settings-cell-value">
                <span>{qualityDisplay[pdfQuality]}</span>
                <span aria-hidden>{openSection === 'quality' ? '⌄' : '›'}</span>
              </span>
            </button>
            {openSection === 'quality' && (
              <div className="settings-cell-body">
                <div className="settings-choice-row settings-choice-row--in-cell">
                  {QUALITY_OPTIONS.map((opt) => {
                    const locked = opt.proOnly && !isPro;
                    const active = pdfQuality === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={`settings-row-btn settings-row-btn--compact${active ? ' settings-row-btn--active' : ''}${locked ? ' settings-row-btn--locked' : ''}`}
                        onClick={() => {
                          if (locked) {
                            handleLockedTap();
                            return;
                          }
                          onPdfQualityChange(opt.id);
                        }}
                      >
                        {active && <span className="settings-choice-check">✓ </span>}
                        {opt.label}
                        {locked ? ' 🔒' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div id="settings-pro-section" className="settings-cell">
            <button
              type="button"
              className="settings-cell-header"
              aria-expanded={openSection === 'purchase'}
              onClick={() => toggleSection('purchase')}
            >
              <span className="settings-cell-label">購入</span>
              <span className="settings-cell-value">
                <span>{purchaseSummary}</span>
                <span aria-hidden>{openSection === 'purchase' ? '⌄' : '›'}</span>
              </span>
            </button>
            {openSection === 'purchase' && (
              <div className="settings-cell-body">
                {isPro ? (
                  <p className="settings-purchase-pro-msg">✓ 無制限プランをご利用中です</p>
                ) : (
                  <div className="settings-purchase-free">
                    <p className="settings-purchase-free__title">無制限プラン</p>
                    <p className="original-price settings-purchase-free__price">通常価格 ¥1,200</p>
                    <button type="button" className="modal-buy-btn" onClick={onPurchase} disabled={isLoading}>
                      {isLoading ? '処理中...' : '¥500 で購入（期間限定）'}
                    </button>
                    <button type="button" className="modal-restore-btn settings-purchase-free__restore" onClick={onRestore} disabled={isLoading}>
                      購入を復元
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="modal-links settings-modal-footer-links">
          <a href="https://s0823pro-cmyk.github.io/privacy-policy/" target="_blank" rel="noopener noreferrer">
            プライバシーポリシー
          </a>
          <span>・</span>
          <a href="https://s0823pro-cmyk.github.io/privacy-policy/terms.html" target="_blank" rel="noopener noreferrer">
            利用規約
          </a>
        </div>

        <button type="button" className="modal-close-btn" onClick={onClose}>
          閉じる
        </button>
      </div>
    </div>
  );
};
