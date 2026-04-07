interface Props {
  onPurchase: () => void;
  onRestore: () => void;
  onClose: () => void;
  isLoading: boolean;
}

export const SettingsModal = ({ onPurchase, onRestore, onClose, isLoading }: Props) => (
  <div className="modal-overlay" role="presentation" onClick={onClose}>
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="modal-icon" aria-hidden>🔓</div>
      <div className="modal-title-row">
        <h2 id="settings-modal-title" className="modal-title">
          無制限プラン
        </h2>
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
      </div>

      <p className="original-price">通常価格 ¥750</p>

      <button type="button" className="modal-buy-btn" onClick={onPurchase} disabled={isLoading}>
        {isLoading ? '処理中...' : '¥500 で購入（期間限定）'}
      </button>

      <div className="modal-legal-disclosure">
        <p>価格はApp Store/Google Playに表示されます</p>
        <p>購入はApple ID/Googleアカウントに請求されます</p>
        <p>購入後は設定からいつでも確認できます</p>
        <p>アプリを削除しても購入は保持されます（購入の復元で回復可能）</p>
      </div>

      <button type="button" className="modal-restore-btn" onClick={onRestore} disabled={isLoading}>
        購入を復元
      </button>

      <div className="modal-links">
        <a href="https://s0823pro-cmyk.github.io/privacy-policy/" target="_blank" rel="noopener noreferrer">
          プライバシーポリシー
        </a>
        <span>・</span>
        <a href="https://s0823pro-cmyk.github.io/privacy-policy/terms.html" target="_blank" rel="noopener noreferrer">
          利用規約
        </a>
      </div>

      <button type="button" className="modal-close-btn" onClick={onClose}>閉じる</button>
    </div>
  </div>
);
