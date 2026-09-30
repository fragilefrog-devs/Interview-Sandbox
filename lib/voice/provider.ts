import { VapiProvider } from "./providers/vapi";
import type { VoiceInterviewProvider } from "./types";

let cached: VoiceInterviewProvider | null = null;
/** Swap here (VOICE_PROVIDER=livekit) once a LiveKit adapter exists. */
export function getVoiceProvider(): VoiceInterviewProvider {
  return (cached ??= new VapiProvider());
}
