import type { PaperSizeId, PdfQualityId } from '../types';

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
  onLockedPaperOptionTap: () => void;
}

const PAPER_OPTIONS: { id: PaperSizeId; label: string; sub: string; proOnly: boolean }[] = [
  { id: 'a3', label: 'A3', sub: '420 × 297mm', proOnly: true },
  { id: 'a4', label: 'A4', sub: '210 × 297mm', proOnly: false },
  { id: 'b5', label: 'B5', sub: '182 × 257mm', proOnly: true },
];

const QUALITY_OPTIONS: { id: PdfQualityId; label: string; proOnly: boolean }[] = [
  { id: 'high', label: '高', proOnly: false },
  { id: 'medium', label: '中', proOnly: true },
  { id: 'low', label: '低', proOnly: true },
];

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
  onLockedPaperOptionTap,
}: Props) => (
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
        設定
      </h2>

      {!isPro ? (
        <div id="settings-pro-section" className="settings-pro-block settings-pro-block--hero">
          <div className="modal-icon" aria-hidden>🔓</div>
          <div className="modal-title-row">
            <h3 className="modal-title modal-title--subsection">無制限プラン</h3>
            <span className="limited-badge">期間限定</span>
          </div>
          <p className="modal-desc">広告なし・枚数制限なしで<br />快適にPDF変換できます</p>

          <div className="modal-features">
            <div className="feature-row">
              <span className="feature-check">✓</span>
              <span>写真枚数 無制限</span>
            </div>
            <div className="feature-row">
              <span className="feature-check">✓</span>
              <span>広告の非表示</span>
            </div>
            <div className="feature-row">
              <span className="feature-check">✓</span>
              <span>買い切り（永久）</span>
            </div>
            <div className="feature-row">
              <span className="feature-check">✓</span>
              <span>A3・B5 用紙サイズ</span>
            </div>
          </div>

          <p className="original-price">通常価格 ¥1,200</p>

          <button type="button" className="modal-buy-btn" onClick={onPurchase} disabled={isLoading}>
            {isLoading ? '処理中...' : '¥500 で購入（期間限定）'}
          </button>

          <div className="modal-legal-disclosure">
            <p>価格はApp Store/Google Playに表示されます</p>
            <p>購入はApple ID/Googleアカウントに請求されます</p>
            <p>購入後は設定からいつでも確認できます</p>
            <p>アプリを削除しても購入は保持されます（購入の復元で回復可能）</p>
          </div>
        </div>
      ) : (
        <div className="settings-pro-status">
          <span className="pro-badge settings-pro-status__badge">PRO</span>
          <p className="settings-pro-status__text">無制限プランをご利用中です</p>
        </div>
      )}

      <div className="settings-modal-divider" />

      <div className="settings-section">
        <div className="settings-label">用紙サイズ</div>
        <div className="settings-choice-col">
          {PAPER_OPTIONS.map((opt) => {
            const locked = opt.proOnly && !isPro;
            const active = paperSize === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                className={`settings-row-btn${active ? ' settings-row-btn--active' : ''}${locked ? ' settings-row-btn--locked' : ''}`}
                onClick={() => {
                  if (locked) {
                    onLockedPaperOptionTap();
                    return;
                  }
                  onPaperSizeChange(opt.id);
                }}
              >
                <span className="settings-choice-row-inner">
                  {active && <span className="settings-choice-check">✓</span>}
                  <span className="settings-choice-label">
                    {opt.label}
                    {locked ? ' 🔒' : ''}
                  </span>
                </span>
                <span className="settings-choice-sub">{opt.sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-label">PDF画質</div>
        <div className="settings-choice-row">
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
                    onLockedPaperOptionTap();
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

      <div className="settings-support-block">
        <button type="button" className="modal-restore-btn" onClick={onRestore} disabled={isLoading}>
          購入を復元
        </button>
      </div>

      <div className="modal-links">
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
