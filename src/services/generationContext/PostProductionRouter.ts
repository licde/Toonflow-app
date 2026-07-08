import type { StructuredShot } from "../structuredScript/types";
import type { PostTask } from "./types";

/** visualEffect / sound / subtitle → 后期任务队列 */
export function routePostProduction(shot: StructuredShot): PostTask[] {
  const tasks: PostTask[] = [];
  const vfx = shot.visualEffect as Record<string, unknown> | undefined;

  if (vfx?.type) {
    tasks.push({
      type: "vfx_overlay",
      shotNo: shot.镜号,
      payload: { type: vfx.type, detail: vfx },
    });
  }

  if (shot.sound?.音效 && shot.sound.音效 !== "无") {
    tasks.push({
      type: "sfx",
      shotNo: shot.镜号,
      payload: {
        音效: shot.sound.音效,
        BGM: shot.sound.BGM,
        dB: shot.sound.dB,
      },
    });
  }

  if (shot.dialogue?.text) {
    tasks.push({
      type: "subtitle",
      shotNo: shot.镜号,
      payload: {
        text: shot.dialogue.text,
        type: shot.dialogue.type,
        speaker: shot.dialogue.speaker,
      },
    });
  }

  if (shot.voiceover && !shot.dialogue?.text) {
    tasks.push({
      type: "tts",
      shotNo: shot.镜号,
      payload: { ...shot.voiceover },
    });
  }

  return tasks;
}
