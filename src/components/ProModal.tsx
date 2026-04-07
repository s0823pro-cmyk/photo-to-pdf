interface Props {
  onPurchase: () => void;
  onRestore: () => void;
  onClose: () => void;
  isLoading: boolean;
}

export const ProModal = ({ onPurchase, onRestore, onClose, isLoading }: Props) => (
  <div className="modal-overlay" role="presentation" onClick={onClose}>
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-modal-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-icon" aria-hidden>🔓</div>
      <h2 id="pro-modal-title" className="modal-title">無制限プラン</h2>
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
      </div>

      <button type="button" className="modal-buy-btn" onClick={onPurchase} disabled={isLoading}>
        {isLoading ? '処理中...' : '¥500 で購入'}
      </button>
      <button type="button" className="modal-restore-btn" onClick={onRestore} disabled={isLoading}>
        購入を復元
      </button>
      <button type="button" className="modal-close-btn" onClick={onClose}>閉じる</button>
    </div>
  </div>
);
