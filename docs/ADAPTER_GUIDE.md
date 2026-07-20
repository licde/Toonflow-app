# Adapter Guide (HostHooks)

For scenarios C/D when integrating outside Toonflow.

## Minimal HostHooks

```typescript
import { inspectBundle, type HostHooks } from "@/ruleEngine/portable";

const hooks: HostHooks = {
  saveShots: async (shots) => { /* persist storyboard panels */ },
  onGenerationError: async (error) => {
    const r = inspectBundle({}, { genError: error });
    return { rePushPlan: r.rePushPlan };
  },
};

const result = inspectBundle(bundleJson, { tier: "T2", hooks });
```

## Toonflow wrapper

```typescript
import { createToonflowHostHooks } from "@/ruleEngine/portable/ToonflowHostHooks";
const host = createToonflowHostHooks(knexDb);
await host.dryRunImport(bundle, { projectId: 1, validateOnly: true });
```

Only implement hooks you need. Headless dryRun (scenario A/B) requires zero hooks.

## Import vs enterProduction

| 入口 | 适用 | 写入内容 |
|------|------|---------|
| `POST /api/ruleEngine/importScript` | Chat T3 完整 bundle（含 `preDesignPack`） | script + 分镜四槽 + blueprint + `mergeReport.scriptId` |
| `POST /api/scriptAgent/enterProduction` | 仅剧本文本进制作 | 更新 script；**不**携带 generation；T3 项目需 `acknowledgeWeakPath:true` |
| `POST /api/ruleEngine/dryRunImport` | 只读预览 | 不写库；`preImport.blocked` 反映 BLOCK |
| `POST /api/ruleEngine/importScript` + `validateOnly:true` | 诊断 + 预测 merge | **不写库**；以 `result.scriptId` / `mergeReport` 为准 |

`extractAssets` 只建 `o_assets` 关联，不写分镜 prompt。轮询 `pollScriptAssets` 使用 `extractState` 枚举：`0=提取中 1=成功 2=排队 -1=失败`。
