/** getPhoto のプロンプト用（Android: 先頭が Photo=アルバム、2番目が Picture=カメラ） */
export const CAMERA_PROMPT_LABELS = {
  promptLabelHeader: '写真を選択',
  promptLabelPhoto: 'ライブラリから選択',
  promptLabelPicture: 'カメラで撮影',
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
