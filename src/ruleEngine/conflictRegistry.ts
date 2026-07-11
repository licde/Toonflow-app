/** V5 vs 规则层.json vs 产品 Skills 已知矛盾登记（P0-pre0） */
export const RULE_CONFLICTS: { id: string; resolution: string }[] = [
  { id: "C1", resolution: "257条 json implemented 改为 maturity 分级，仅 Tier0 proven 可 BLOCK" },
  { id: "C2", resolution: "无 build_episode_beat tool，使用 ScriptPlanParser" },
  { id: "C3", resolution: "V5 反馈 H 层路由：H2→GB, H3→SB, H4→EN" },
  { id: "C4", resolution: "canonical 8 阶段：N-1→P0→G→BP→GB→SB→EN→MD→P2" },
  { id: "C5", resolution: "Skills 收敛到 RuleConflictRegistry，无双轨" },
  { id: "C6", resolution: "仅 Tier0 允许 BLOCK" },
  { id: "C7", resolution: "697 条统一 registry，257 为 executable 子集" },
  { id: "C8", resolution: "H1 弦乐规则仅视觉层；BGM 在 Z109" },
  { id: "AG-AUD-07", resolution: "无 dialogue 但有 sfx 时 audio 仍为 true（sfx-native 路径）" },
];

export function getConflictResolution(id: string): string | undefined {
  return RULE_CONFLICTS.find((c) => c.id === id)?.resolution;
}
