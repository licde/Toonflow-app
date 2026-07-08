import type { EffectStack, StructuredShot } from "../structuredScript/types";
import type { AudioRouteResult, ModelCapabilities } from "./types";
import { routePostProduction } from "./PostProductionRouter";

/** 混合配音：M1 video_native，M2 TTS 备用 */
export function routeAudio(
  shot: StructuredShot,
  effectStack: EffectStack,
  caps: ModelCapabilities,
): AudioRouteResult {
  const postTasks = routePostProduction(shot).filter((t) => t.type === "tts" || t.type === "subtitle");
  const hasDialogue = !!(shot.dialogue?.text);
  const hasVoiceover = !!shot.voiceover && !hasDialogue;

  let voice = effectStack.voice;
  if (voice === "auto") voice = hasDialogue ? "video_native" : hasVoiceover ? "tts" : "off";

  if (voice === "video_native" && caps.supportsAudio && hasDialogue) {
    return { voice, audio: true, postTasks };
  }

  if (voice === "tts" || hasVoiceover) {
    const text = shot.dialogue?.text ?? (shot.voiceover as Record<string, string> | undefined)?.text ?? "";
    return {
      voice: "tts",
      audio: false,
      ttsText: text,
      postTasks: [
        ...postTasks,
        { type: "tts", shotNo: shot.镜号, payload: { text, voiceover: shot.voiceover } },
      ],
    };
  }

  return { voice: "off", audio: false, postTasks };
}
