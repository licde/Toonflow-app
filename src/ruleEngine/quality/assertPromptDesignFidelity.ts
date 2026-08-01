/**
 * M5 Prompt design fidelity — artifact must cover design anchors.
 */
import { buildShotChainContract, assertChainEgress, type ChainEgressFinding } from "./shotChainContract";

export function assertPromptDesignFidelity(input: {
  shot: Record<string, unknown>;
  knownNames?: string[];
  imagePrompt?: string;
  videoPrompt?: string;
  stage?: "compose" | "finalize" | "burn";
  fidelityHard?: boolean;
}): { ok: boolean; findings: ChainEgressFinding[] } {
  const contract = buildShotChainContract(input.shot, { knownNames: input.knownNames });
  const r = assertChainEgress(input.stage ?? "finalize", contract, {
    imagePrompt: input.imagePrompt,
    videoPrompt: input.videoPrompt,
    // Never hard-block; findings are CONTRACT debts for heal routers
    fidelityHard: false,
  });
  return { ok: r.ok, findings: r.findings.filter((f) => f.id === "PROMPT-FIDELITY" || f.id === "DEX-STILL-ONEBEAT") };
}
