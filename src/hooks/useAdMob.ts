import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useRef } from 'react';

/** 本番確認用: テストID・DEV判定を使わず本番ユニットIDで動かす */
const IS_DEV = false; // テスト用に強制本番ID

/** 動作確認のため Android 本番IDに固定（iOS では別IDに戻す場合は下記定数を復元） */
const BANNER_AD_ID = 'ca-app-pub-6731542556992059/4336048057';
const INTERSTITIAL_AD_ID = 'ca-app-pub-6731542556992059/9476694093';

export const useAdMob = (isPro: boolean) => {
  const interstitialReady = useRef(false);

  const loadInterstitial = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      console.log('[AdMob] インタースティシャル読み込み開始', { adId: INTERSTITIAL_AD_ID });
      await AdMob.prepareInterstitial({
        adId: INTERSTITIAL_AD_ID,
        isTesting: false,
      });
      interstitialReady.current = true;
      console.log('[AdMob] インタースティシャル準備完了（表示待ち）', { adId: INTERSTITIAL_AD_ID });
    } catch (e) {
      console.warn('Interstitial load failed:', e);
    }
  }, []);

  useEffect(() => {
    const removeBannerSafe = async () => {
      try {
        const { AdMob } = await import('@capacitor-community/admob');
        await AdMob.removeBanner();
      } catch {
        /* ignore */
      }
    };

    if (isPro) {
      interstitialReady.current = false;
      void removeBannerSafe();
      return;
    }

    if (!Capacitor.isNativePlatform()) {
      console.log('[AdMob] スキップ: ネイティブ以外では広告を出しません');
      return;
    }

    void (async () => {
      try {
        const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');

        console.log('[AdMob] initialize 開始', { IS_DEV });
        await AdMob.initialize({
          testingDevices: [],
          initializeForTesting: false,
        });
        console.log('[AdMob] initialize 完了', { initializeForTesting: false });

        await AdMob.showBanner({
          adId: BANNER_AD_ID,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: false,
        });
        console.log('[AdMob] バナー表示リクエスト', { adId: BANNER_AD_ID });

        await loadInterstitial();
      } catch (e) {
        console.warn('AdMob init failed:', e);
      }
    })();
  }, [isPro, loadInterstitial]);

  const showInterstitial = useCallback(async () => {
    if (isPro) return;
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      if (interstitialReady.current) {
        console.log('[AdMob] インタースティシャル表示', { adId: INTERSTITIAL_AD_ID });
        await AdMob.showInterstitial();
        interstitialReady.current = false;
        await loadInterstitial();
      } else {
        console.log('[AdMob] インタースティシャル表示スキップ（未準備）');
      }
    } catch (e) {
      console.warn('Interstitial show failed:', e);
    }
  }, [isPro, loadInterstitial]);

  const hideBanner = useCallback(async () => {
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.removeBanner();
    } catch {
      /* ignore */
    }
  }, []);

  return { showInterstitial, hideBanner };
};
