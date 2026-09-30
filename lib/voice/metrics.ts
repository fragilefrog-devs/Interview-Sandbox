import type { VoiceMetrics, VoiceSegment } from "./types";

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

export function computeMetrics(segs: VoiceSegment[]): VoiceMetrics {
  const iw = segs.filter((s) => s.speaker === "interviewer").reduce((n, s) => n + words(s.content), 0);
  const cw = segs.filter((s) => s.speaker === "candidate").reduce((n, s) => n + words(s.content), 0);
  let interruptions = 0, gapSum = 0, gapN = 0, longestPause = 0;
  for (let i = 1; i < segs.length; i++) {
    const prev = segs[i - 1], cur = segs[i];
    if (prev.speaker === cur.speaker) continue;
    const gap = cur.startMs - prev.endMs;
    if (prev.speaker === "candidate" && cur.speaker === "interviewer") {
      if (gap < -300) interruptions++;          // tolerate small transcription overlap
      else { gapSum += Math.max(0, gap); gapN++; }
    }
    longestPause = Math.max(longestPause, gap);
  }
  return {
    durationMs: segs.reduce((m, s) => Math.max(m, s.endMs), 0),
    interviewerWords: iw, candidateWords: cw,
    talkRatio: iw + cw ? iw / (iw + cw) : 0,
    questions: segs.filter((s) => s.speaker === "interviewer").reduce((n, s) => n + (s.content.match(/\?/g)?.length ?? 0), 0),
    interruptions,
    avgResponseGapMs: gapN ? Math.round(gapSum / gapN) : 0,
    longestInterviewerTurnMs: segs.filter((s) => s.speaker === "interviewer").reduce((m, s) => Math.max(m, s.endMs - s.startMs), 0),
    longestPauseMs: Math.max(0, longestPause),
  };
}
