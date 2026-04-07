import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useRef } from 'react';

/** Android 本番ユニット */
const BANNER_ID_ANDROID = 'ca-app-pub-6731542556992059/4336048057';
const INTERSTITIAL_ID_ANDROID = 'ca-app-pub-6731542556992059/9476694093';
/** iOS 本番ユニット */
const BANNER_ID_IOS = 'ca-app-pub-6731542556992059/7754819825';
const INTERSTITIAL_ID_IOS = 'ca-app-pub-6731542556992059/1035061900';

const isIos = Capacitor.getPlatform() === 'ios';
const BANNER_ID = isIos ? BANNER_ID_IOS : BANNER_ID_ANDROID;
const INTERSTITIAL_ID = isIos ? INTERSTITIAL_ID_IOS : INTERSTITIAL_ID_ANDROID;

const BANNER_TEST = 'ca-app-pub-3940256099942544/6300978111';
const INTERSTITIAL_TEST = 'ca-app-pub-3940256099942544/1033173712';

const IS_DEV = true;

const BANNER_AD_ID = IS_DEV ? BANNER_TEST : BANNER_ID;
const INTERSTITIAL_AD_ID = IS_DEV ? INTERSTITIAL_TEST : INTERSTITIAL_ID;

export const useAdMob = (isPro: boolean) => {
  const interstitialReady = useRef(false);

  const loadInterstitial = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      console.log('[AdMob] インタースティシャル読み込み開始', { adId: INTERSTITIAL_AD_ID, IS_DEV });
      await AdMob.prepareInterstitial({
        adId: INTERSTITIAL_AD_ID,
        isTesting: IS_DEV,
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
          testingDevices: ['f74592a739f621223f003a81bc48e76e'],
          initializeForTesting: true,
        });
        console.log('[AdMob] initialize 完了', {
          initializeForTesting: true,
          testingDevices: ['f74592a739f621223f003a81bc48e76e'],
        });

        await AdMob.showBanner({
          adId: BANNER_AD_ID,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: IS_DEV,
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
