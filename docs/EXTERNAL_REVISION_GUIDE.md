# 外部改版与 Bundle 往返指南 v2.0.1

## 默认：ScriptBundle

- **Skill（LLM）**：`data/skills/browser_full_flow.bundle.md`（`yarn bundle:browser-full-flow`）
- **人读教程**：[`docs/BROWSER_CHAT_TUTORIAL.md`](./BROWSER_CHAT_TUTORIAL.md)
- **样例**：`data/fixtures/script-bundle-template-v2.json`
- **导入**：`POST /api/ruleEngine/importScript`

> v1.1 `design_flow.bundle.md` 已 redirect 至 v2.0.1。

## 高级：EpisodeBundle（T3）

- Skill 套件：`data/skills/browser_chat/`
- 四模态：见 bundle §15 / 附录 P
- 样例：`data/fixtures/flow-data-template.json` + `episode-package-template.json`
- 导入：`POST /api/ruleEngine/importBundle`

## 往返测试

```bash
yarn test:bundle-roundtrip
yarn test:production-closure-golden   # PC-01~14 golden G72–G85
```

覆盖：dryRun → importScript + autoDesign → exportScriptBundle → importEpisodeBundle

## 制作闭环 dryRun

Chat T3 export 与 import **共用** `productionClosureDryRun`（PC-01~14）。见 `production_closure_checklist.json`。

## 覆盖率报告三分

`getReport` / `validate` 返回的 `ruleCoverage` 含：

- `executed` — 本次命中规则数
- `registered` — 注册表总数
- `skipped` — 未执行数
