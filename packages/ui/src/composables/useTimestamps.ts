import type { Track } from '@sonata/shared-types';

/**
 * Converte string de timestamp (MM:SS ou HH:MM:SS) em segundos inteiros
 */
export function timestampToSeconds(timeStr: string): number {
  const parts = timeStr.trim().replace(/[\[\]\(\)]/g, '').split(':').map(Number);
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  return 0;
}

/**
 * Converte segundos inteiros em formato legível MM:SS ou HH:MM:SS
 */
export function secondsToTimestamp(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${pad(m)}:${pad(s)}`;
}

const TIMESTAMP_LINE_REGEX =
  /^(?:(?:\[|\()?(?<time1>(?:\d{1,2}:)?\d{2}:\d{2})(?:\]|\))?[\s\-–—:]+(?<title1>.+)|(?<title2>.+?)[\s\-–—:]+(?:\[|\()?(?<time2>(?:\d{1,2}:)?\d{2}:\d{2})(?:\]|\))?)$/;

/**
 * Parser de texto para extrair faixas ordenadas
 */
export function parseTimestampsFromText(text: string, totalDurationSeconds?: number): Track[] {
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const rawTracks: Array<{ title: string; seconds: number; timeStr: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(TIMESTAMP_LINE_REGEX);
    if (match && match.groups) {
      const timeStr = match.groups.time1 || match.groups.time2;
      let title = (match.groups.title1 || match.groups.title2 || '').trim();
      title = title.replace(/^\d+[\.\-\)]\s*/, '');

      if (timeStr && title) {
        const seconds = timestampToSeconds(timeStr);
        rawTracks.push({
          title,
          seconds,
          timeStr
        });
      }
    }
  }

  rawTracks.sort((a, b) => a.seconds - b.seconds);

  const tracks: Track[] = rawTracks.map((item, index) => {
    const nextItem = rawTracks[index + 1];
    let endSeconds: number | undefined;

    if (nextItem) {
      endSeconds = nextItem.seconds;
    } else if (totalDurationSeconds && totalDurationSeconds > item.seconds) {
      endSeconds = totalDurationSeconds;
    }

    return {
      id: `track-${index + 1}-${Date.now()}`,
      index: index + 1,
      title: item.title,
      startTime: secondsToTimestamp(item.seconds),
      startSeconds: item.seconds,
      endTime: endSeconds !== undefined ? secondsToTimestamp(endSeconds) : undefined,
      endSeconds,
      selected: true
    };
  });

  return tracks;
}

export function useTimestamps() {
  return {
    timestampToSeconds,
    secondsToTimestamp,
    parseTimestampsFromText
  };
}
