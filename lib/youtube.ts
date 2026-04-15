/** Extract YouTube video id from common URL shapes for thumbnail preview. */
export function getYouTubeId(url: string): string | null {
  const reg = /(?:youtube\.com\/(?:embed\/|.*v=)|youtu\.be\/)([^&?]+)/;
  const match = url.match(reg);
  return match ? match[1] : null;
}
