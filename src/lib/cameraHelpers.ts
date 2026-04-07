/** getPhoto / pickImages 用（プラットフォームの表示に反映） */
export const CAMERA_PROMPT_LABELS = {
  promptLabelHeader: '写真を選択',
  promptLabelPhoto: 'カメラで撮影',
  promptLabelPicture: 'ライブラリから選択',
  promptLabelCancel: 'キャンセル',
} as const;

export async function webPathToDataUrl(webPath: string): Promise<string> {
  const res = await fetch(webPath);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
