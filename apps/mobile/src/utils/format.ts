/** Formats a track duration as `m:ss`, or `--:--` when unknown. */
export function formatDuration(durationMs: number): string {
  if (!durationMs) {
    return '--:--';
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** Formats a playback position in seconds as `m:ss`. */
export function formatPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;

  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

/** Formats a collection duration as `42 min` or `1 hr 12 min`. */
export function formatTotalDuration(durationMs: number): string {
  if (!durationMs) {
    return '--';
  }

  const totalMinutes = Math.round(durationMs / 60_000);

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes > 0 ? `${hours} hr ${minutes} min` : `${hours} hr`;
}
