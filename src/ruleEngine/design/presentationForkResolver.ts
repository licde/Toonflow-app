export type PresentationFork = "fork-A" | "fork-B";

export function resolvePresentationFork(symptom: string): PresentationFork {
  if (/构图|spatial|难表达/i.test(symptom)) return "fork-B";
  return "fork-A";
}

export function forkLabel(fork: PresentationFork): string {
  return fork === "fork-A" ? "改 W3 △ 叙事描述" : "改 SB spatialRelation 镜级";
}
