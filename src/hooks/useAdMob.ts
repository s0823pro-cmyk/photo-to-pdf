import { Capacitor } from '@capacitor/core';
import { useCallback, useEffect, useRef } from 'react';

const BANNER_ID_ANDROID = 'ca-app-pub-6731542556992059/4336048057';
const INTERSTITIAL_ID_ANDROID = 'ca-app-pub-6731542556992059/9476694093';

// テスト用ID（開発中はこちらを使う）
const BANNER_TEST = 'ca-app-pub-3940256099942544/6300978111';
const INTERSTITIAL_TEST = 'ca-app-pub-3940256099942544/1033173712';

const IS_DEV = import.meta.env.DEV;

export const useAdMob = (isPro: boolean) => {
  const interstitialReady = useRef(false);

  const loadInterstitial = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.prepareInterstitial({
        adId: IS_DEV ? INTERSTITIAL_TEST : INTERSTITIAL_ID_ANDROID,
        isTesting: IS_DEV,
      });
      interstitialReady.current = true;
    } catch (e) {
      console.log('Interstitial load failed:', e);
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

    if (!Capacitor.isNativePlatform()) return;

    void (async () => {
      try {
        const { AdMob, BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');

        await AdMob.initialize({
          testingDevices: [],
          initializeForTesting: IS_DEV,
        });

        await AdMob.showBanner({
          adId: IS_DEV ? BANNER_TEST : BANNER_ID_ANDROID,
          adSize: BannerAdSize.BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: IS_DEV,
        });

        await loadInterstitial();
      } catch (e) {
        console.log('AdMob init failed:', e);
      }
    })();
  }, [isPro, loadInterstitial]);

  const showInterstitial = useCallback(async () => {
    if (isPro) return;
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      if (interstitialReady.current) {
        await AdMob.showInterstitial();
        interstitialReady.current = false;
        await loadInterstitial();
      }
    } catch (e) {
      console.log('Interstitial show failed:', e);
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
