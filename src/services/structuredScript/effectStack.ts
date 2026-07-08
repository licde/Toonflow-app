import type { EffectStack, StructuredShot } from "./types";

export function resolveEffectStack(
  shot: StructuredShot,
  opts?: { isMemoryPoint?: boolean; hasDirectorNote?: boolean },
): Required<EffectStack> {
  const custom = shot.effectStack ?? {};
  const hasDialogue = Boolean(shot.dialogue?.text);
  const hasVisualEffect = Boolean(shot.visualEffect);
  const intensity = shot.emotionIntensity ?? 1;

  let voice: EffectStack["voice"] = custom.voice ?? "auto";
  if (voice === "auto") voice = hasDialogue ? "video_native" : "off";

  let motion: EffectStack["motion"] = custom.motion ?? "auto";
  if (motion === "auto") {
    if (opts?.isMemoryPoint || opts?.hasDirectorNote || shot.personalitySwitch?.enabled) motion = "enhanced";
    else if (hasVisualEffect || intensity >= 4) motion = "enhanced";
    else motion = "basic";
  }

  let sfx: EffectStack["sfx"] = custom.sfx ?? "auto";
  if (sfx === "auto") {
    sfx = hasVisualEffect ? "post_layer" : shot.sound ? "prompt_only" : "off";
  }

  return { voice: voice!, motion: motion!, sfx: sfx! };
}
