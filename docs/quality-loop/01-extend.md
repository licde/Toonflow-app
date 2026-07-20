# 01 — 扩展 quality-loop

新维度 = **一行 matrix + handler（或 Adapter）+ 金样**，不改 Gate 核心编排。

## 步骤

1. 在 `data/fixtures/quality_matrix.json` 加一行：

```json
{
  "id": "XX-01",
  "domain": "visual",
  "stages": ["export", "preflight"],
  "severityByStage": { "export": "BLOCK", "preflight": "WARN" },
  "handler": "xx01",
  "repairHintId": "RH-XX-01",
  "softPatch": true,
  "t3Ep1Elevate": "BLOCK"
}
```

2. 在 `qualityGate/index.ts` 的对应 stage 分支 `push({ id: "XX-01", ... })`。
3. 若 `softPatch: true`：按 `docs/precheck-loop/01-adapter-cookbook.md` 加 Adapter，并写入 `precheck_repair_decision.json`。
4. 金样断言写入 `scripts/test-quality-gate.ts`（export 与 burn 对 hard 规则同失败）。
5. 跑：

```bash
yarn test:quality-gate
yarn audit:quality-matrix-coverage
```

## 移植边界

| 进 Core | 留 Host |
|---------|---------|
| `qualityGate` + matrix + whitelist + adapters | Express 路由、DB、`@obs` |
| 零 Express / Knex / obs 强依赖 | `generateVideo*` 挂载调用 |

## Chat 对齐

- T3 export **必须**调 `POST /api/ruleEngine/exportGate`（聚合 designPhaseGates + qualityGate + field walk）
- `design_compliance_gate` 以 **server `closureSnapshot`** 为权威，禁止自写 `ruleAudit.passed` / `linkageAudit=pass`
- 技能只引用 matrix id（`QM-CAM-*` / `LANG-01` / `VIR-01`…），禁止自创 pass
- NAR-14/15、CD 覆盖、中文 scene key：**Chat 改 JSON 字段**；precheckLoop 仅声明型（F0/LANG/CAM）
