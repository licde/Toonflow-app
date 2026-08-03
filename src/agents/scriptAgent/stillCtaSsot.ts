/**
 * Chat/Web still CTA SSOT — agents and FE must use the same labels.
 * Re-exports docs stillQuality resolver so Chat tools do not invent copy.
 */
export {
  resolveStillPrimaryCtaLabel,
  shouldBlockSilentStillRegen,
  type StillMeta,
} from "../../../docs/toonflow-web/types/stillQuality";

export { resolveStillPrimaryCta } from "../../ruleEngine/design/shootableArchitecture";
