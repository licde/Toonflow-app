export type PresentationFork = "fork-A" | "fork-B";

export function resolvePresentationFork(symptom: string): PresentationFork {
  if (/构图|spatial|难表达|confront|layout|座次|对峙/i.test(symptom)) return "fork-B";
  if (/cu_cast|cast_cardinality|群像|ensemble/i.test(symptom)) return "fork-B";
  return "fork-A";
}

export function forkLabel(fork: PresentationFork): string {
  return fork === "fork-A" ? "改 W3 △ 叙事描述" : "改 SB spatialRelation 镜级";
}

/** FE / IRD: never empty-skip to chat_repair without choosing a fork when med confidence. */
export function presentationForkChoices(triggerOrMessage: string): {
  fork: PresentationFork;
  label: string;
  primaryNextStep: "chat_repair" | "split_shot";
}[] {
  const preferred = resolvePresentationFork(triggerOrMessage);
  const other: PresentationFork = preferred === "fork-A" ? "fork-B" : "fork-A";
  return [
    {
      fork: preferred,
      label: forkLabel(preferred),
      primaryNextStep: preferred === "fork-A" ? "chat_repair" : "split_shot",
    },
    {
      fork: other,
      label: forkLabel(other),
      primaryNextStep: other === "fork-A" ? "chat_repair" : "split_shot",
    },
  ];
}
