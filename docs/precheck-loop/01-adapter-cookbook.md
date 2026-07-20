# 01 — Adapter cookbook

加一个 check（约 10 分钟）：

1. 在 `src/ruleEngine/precheckLoop/adapters/` 新建 `xx.ts`，实现：

```ts
export const xxAdapter: CheckAdapter = {
  id: "XX-01",
  diagnose(ctx) { /* return DiagnosisFinding with evidence + fingerprint */ },
  suggestRepair?(finding, ctx) { /* optional SuggestedPatch[] */ },
};
```

2. 在 `adapters/index.ts` 的 `ensureDefaultAdapters` 里 `registerAdapter(xxAdapter)`。
3. 在 `data/fixtures/precheck_repair_decision.json` 增加该 id 的 `soft_patch_when` / `human_when` / `repairHintId`。
4. 若属 closure registry：在 `closure_detection_registry.json` 填 `repairHintId`。
5. 加 golden：`data/fixtures/golden/precheck-loop-xx.json`，并在 `scripts/test-precheck-loop.ts` 断言。
6. **不要**改 `runPrecheckLoop.ts` 核心编排；Verify 永远是再跑 `diagnose`。

## DC-01 样板要点

- 证据来自 `dialogueCoverageReport`（禁止只返回 boolean）
- `storyboardIds` / `scope.mode=filtered` → 不按全集 expected BLOCK 触达
- 高置信漏行 → `appendDialogueLines` soft_patch
