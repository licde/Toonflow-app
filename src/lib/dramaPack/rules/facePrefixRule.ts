import type { PackFieldRule } from "../packFieldRegistry";
import { lookupLockDescription } from "../characterAssetUtils";
import { SAME_FACE_SECONDARY_REF } from "../personaPolicy";

export const facePrefixRule: PackFieldRule = {
  id: "L0-baseModel",
  channel: "imagePrompt",
  priority: 30,
  apply(state, rctx) {
    const charCode = (rctx.shot.assetCodes ?? []).find((c) => c.startsWith("CHAR-"));
    if (!charCode || !rctx.ctx.extensions?.characterAssets?.[charCode]) return;
    const lockDesc = lookupLockDescription(rctx.ctx.extensions.characterAssets[charCode] as Record<string, unknown>);
    if (!lockDesc) return;
    const prefix = lockDesc.split(",").slice(0, 6).join(",").trim();
    if (prefix.length > 20 && !state.promptContains(state.imagePrompt, prefix.slice(0, 12))) {
      state.imagePrompt = state.mergeFragment(state.imagePrompt, prefix);
    }
    const secondary = SAME_FACE_SECONDARY_REF[charCode];
    if (secondary && /same face/i.test(lockDesc)) {
      state.imagePrompt = state.mergeFragment(state.imagePrompt, `same face as ${secondary}`);
    }
  },
};
