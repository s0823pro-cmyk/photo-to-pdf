import { Capacitor } from '@capacitor/core';

/** ネイティブではボタン表記を「OK」に統一（window.alert は OS 依存で "Ok" になることがある） */
export async function showAlertOk(message: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Dialog } = await import('@capacitor/dialog');
    await Dialog.alert({
      message,
      buttonTitle: 'OK',
    });
    return;
  }
  window.alert(message);
}
