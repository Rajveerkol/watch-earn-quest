/** Extracts an 11-character YouTube video id from the common URL formats. */
export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/watch\?[^#]*\bv=([A-Za-z0-9_-]{11})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
    /youtube\.com\/v\/([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const match = raw.match(re);
    if (match) return match[1]!;
  }
  return null;
}

export function thumbnailFor(youtubeId: string, quality: "mq" | "hq" = "mq"): string {
  return `https://i.ytimg.com/vi/${youtubeId}/${quality}default.jpg`;
}

export const COINS_PER_RUPEE = 1000;

export function rupeesToCoins(rupees: number): number {
  return Math.round(rupees * COINS_PER_RUPEE);
}

export function formatCoins(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Math.max(0, Math.round(value)));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}
