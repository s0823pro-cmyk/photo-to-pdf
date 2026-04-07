import { Capacitor } from '@capacitor/core';
import { useState } from 'react';

const PRODUCT_ID = 'remove_ads_unlimited';

function readIsProFromStorage(): boolean {
  try {
    return localStorage.getItem('isPro') === 'true';
  } catch {
    return false;
  }
}

function isErrWithCode(e: unknown): e is { code?: string } {
  return typeof e === 'object' && e !== null && 'code' in e;
}

export const usePurchase = () => {
  const [isPro, setIsPro] = useState<boolean>(() => readIsProFromStorage());
  const [isLoading, setIsLoading] = useState(false);

  const purchase = async () => {
    setIsLoading(true);
    try {
      const { NativePurchases } = await import('@capgo/native-purchases');
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: PRODUCT_ID,
      });
      const purchased =
        transaction?.productIdentifier === PRODUCT_ID ||
        (!Capacitor.isNativePlatform() &&
          transaction != null &&
          typeof transaction.transactionId === 'string');
      if (purchased) {
        localStorage.setItem('isPro', 'true');
        setIsPro(true);
        alert('購入完了！Proでご利用いただけます。');
      }
    } catch (e: unknown) {
      if (isErrWithCode(e) && e.code === 'PURCHASE_CANCELLED') {
        return;
      }
      alert('購入に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const restore = async () => {
    setIsLoading(true);
    try {
      const { NativePurchases } = await import('@capgo/native-purchases');
      await NativePurchases.restorePurchases();
      const { purchases } = await NativePurchases.getPurchases();
      const hasActive = purchases.some((t) => t.productIdentifier === PRODUCT_ID);
      if (hasActive) {
        localStorage.setItem('isPro', 'true');
        setIsPro(true);
        alert('購入を復元しました！');
      } else {
        alert('復元できる購入が見つかりませんでした。');
      }
    } catch {
      alert('復元に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPurchase = () => {
    try {
      localStorage.removeItem('isPro');
    } catch {
      /* ignore */
    }
    setIsPro(false);
  };

  return { isPro, isLoading, purchase, restore, resetPurchase };
};
