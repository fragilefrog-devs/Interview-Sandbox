export type VoiceSegment = { speaker: "interviewer" | "candidate"; content: string; startMs: number; endMs: number };

/** Behavioral signals only text cannot show. Coaching about the interviewer, never a candidate score. */
export type VoiceMetrics = {
  durationMs: number;
  interviewerWords: number;
  candidateWords: number;
  /** Interviewer share of all spoken words, 0..1. */
  talkRatio: number;
  questions: number;
  /** Interviewer started speaking before the candidate finished. */
  interruptions: number;
  avgResponseGapMs: number;
  longestInterviewerTurnMs: number;
  longestPauseMs: number;
};

export type VoiceEvent =
  | { type: "started"; assistantId: string; callId?: string }
  | { type: "ended"; assistantId: string; callId?: string; reason?: string; segments: VoiceSegment[] };

export type VoiceSessionInit = { assistantId: string; publicKey: string };

/** The app talks to this, never to a vendor SDK. Vapi today; LiveKit Agents later. */
export interface VoiceInterviewProvider {
  readonly name: string;
  readonly configured: boolean;
  /** Server-side: create the runtime that will speak as the candidate. */
  createSession(input: { sessionId: string; llmUrl: string; webhookUrl: string; webhookSecret: string }): Promise<VoiceSessionInit>;
  /** Server-side cleanup of provider resources. Best effort. */
  endSession(assistantId: string): Promise<void>;
  verifyWebhook(req: Request): boolean;
  parseWebhook(payload: unknown): VoiceEvent | null;
}
