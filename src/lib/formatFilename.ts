/** 表示用にファイル名を最大文字数で省略（末尾に …） */
export function truncateFileName(name: string, max = 15): string {
  if (name.length <= max) return name;
  return `${name.slice(0, max)}…`;
}
