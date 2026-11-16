import { SubtitleCue } from '../types/queue.ts';

function parseTimestampToSec(ts: string): number {
  const clean = ts.trim().replace(',', '.');
  const parts = clean.split(':').map(Number);
  if (parts.some((p) => Number.isNaN(p))) return 0;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

export function formatSecToSrtTimestamp(sec: number): string {
  const safe = Math.max(0, sec);
  const hours = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function formatSecToVttTimestamp(sec: number): string {
  return formatSecToSrtTimestamp(sec).replace(',', '.');
}

export function parseSubtitlesText(content: string): SubtitleCue[] {
  const normalized = (content || '').replace(/\r\n/g, '\n').replace(/^WEBVTT[^\n]*\n+/i, '').trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd());
    const timingIdx = lines.findIndex((l) => l.includes('-->'));
    if (timingIdx === -1) continue;

    const timingLine = lines[timingIdx];
    const [startRaw, endRaw] = timingLine.split('-->').map((s) => s.trim().split(/\s+/)[0]);
    const startSec = parseTimestampToSec(startRaw);
    const endSec = Math.max(startSec + 0.1, parseTimestampToSec(endRaw));
    const text = lines
      .slice(timingIdx + 1)
      .join('\n')
      .trim();
    if (!text) continue;

    cues.push({
      id: `cue-${cues.length + 1}-${Math.round(startSec * 100)}`,
      startSec: Number(startSec.toFixed(2)),
      endSec: Number(endSec.toFixed(2)),
      text,
    });
  }

  return cues.sort((a, b) => a.startSec - b.startSec);
}

export function serializeCuesToSrt(cues: SubtitleCue[]): string {
  return cues
    .map(
      (cue, idx) =>
        `${idx + 1}\n${formatSecToSrtTimestamp(cue.startSec)} --> ${formatSecToSrtTimestamp(
          Math.max(cue.startSec + 0.1, cue.endSec)
        )}\n${cue.text.trim()}`
    )
    .join('\n\n');
}

export function serializeCuesToVtt(cues: SubtitleCue[]): string {
  const body = cues
    .map(
      (cue) =>
        `${formatSecToVttTimestamp(cue.startSec)} --> ${formatSecToVttTimestamp(
          Math.max(cue.startSec + 0.1, cue.endSec)
        )}\n${cue.text.trim()}`
    )
    .join('\n\n');
  return `WEBVTT\n\n${body}`;
}
