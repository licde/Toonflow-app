# Fork 独立规则引擎仓库指南

将 `portable-kit/` 拆为独立 Git 仓库，场景 A/B **零 Knex** 运行闭环。

## 一键生成 kit

```bash
yarn sync:portable-kit          # T1 ~157KB
yarn sync:portable-kit --tier T3  # +modality fixtures
```

## 最小文件清单（T1）

```
portable-kit/
├── run.mjs                          # 空目录 golden 自测
├── README.md
├── package.json                     # sync 生成
├── src/ruleEngine/
│   ├── portable/                    # M9e inspectBundle API
│   ├── closure/                     # ClosureRegistry
│   ├── bundle/                      # schema + dryRun（无 importAdapter）
│   ├── design/                      # forwardTrace + reverseRoute
│   ├── validators/
│   ├── parsers/
│   ├── compilers/
│   ├── transform/
│   └── utils/fixturesPath.ts
├── data/fixtures/
│   ├── unified_closure_matrix.json
│   ├── linkage_chains.json
│   ├── chain_trigger_map.json
│   ├── reverse_route_table.json
│   ├── repair_hint_catalog.json
│   ├── *\_closure_checklist.json
│   ├── script-bundle-template-v2.json
│   └── golden/*.json
└── scripts/test-inspect-bundle.ts
```

**排除**（宿主专用）：`importAdapter`, `facade`, `routes`, `storage`, `autoDesign`

## Fork 步骤

1. `yarn sync:portable-kit`
2. `cd portable-kit && git init && git add .`
3. 添加 `package.json` scripts（sync 已生成）：
   - `"test": "tsx scripts/test-inspect-bundle.ts"`
   - `"inspect": "tsx bin/inspect.mjs"`
4. 设置 `FIXTURES_ROOT` 环境变量指向 `data/fixtures`
5. 验证：`node run.mjs` → `=== inspect-bundle OK ===`
6. 推送到新仓库，接入 `.github/workflows/portable.yml`（从主仓库复制）

## 独立维护映射

| 改什么 | 在主仓库改 | 同步到 fork |
|--------|-----------|-------------|
| 闭环逻辑 | `src/ruleEngine/design/*` | `yarn sync:portable-kit` |
| 路由/矩阵 | `data/fixtures/*` | sync |
| Chat bundle | `data/skills/browser_chat/` | 不纳入 kit（M7 排除） |

## CI 三门禁

```bash
yarn lint
yarn test:inspect-bundle
yarn audit:routing-drift && yarn audit:qp-coverage
```

完整 CI 见 [.github/workflows/portable.yml](../.github/workflows/portable.yml)。

## 消费方式

```typescript
import { inspectBundle } from "./src/ruleEngine/portable";
const r = inspectBundle(bundleJson, { tier: "T1" });
```

```bash
node run.mjs
yarn inspect:bundle data/fixtures/script-bundle-template-v2.json
```

详见 [PORTABLE_QUICKSTART.md](./PORTABLE_QUICKSTART.md)。
