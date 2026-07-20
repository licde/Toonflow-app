# 规则引擎前端测试指南

> 闭环文档包（导入假绿测试 / SelfHeal 自集成）→ [`docs/closure-selfheal/`](./closure-selfheal/)

本文说明如何在 Toonflow 中进入修订后的规则引擎流程，以及如何导入测试 JSON 快速验证校验与编译链路。

## 1. 启动方式

### 方式 A：前后端分离开发（推荐调试 UI）

```bash
# 终端 1 — 后端
cd i:\toonflow\new\Toonflow-app
yarn dev
# 监听 http://localhost:10588

# 终端 2 — 前端
cd I:\toonflow\Toonflow-web
yarn dev
# 监听 http://localhost:50188
```

前端 `baseUrl` 需指向 `http://localhost:10588/api`（含 `/api` 前缀）。

### 方式 B：集成静态资源（接近生产）

```bash
cd I:\toonflow\Toonflow-web
yarn build:integrate
# 产物复制到 Toonflow-app/data/web

cd i:\toonflow\new\Toonflow-app
yarn dev
# 浏览器访问 http://localhost:10588
```

## 2. 登录

默认账号（数据库无用户时 `fixDB` 自动种子）：

| 用户名 | 密码 |
|--------|------|
| admin  | admin123 |

若仍报「登录失败」，重启后端使 `fixDB` 重新执行。

## 3. 前端入口（修订流程）

```
登录 → 我的项目 → 进入项目 → 顶部「制作」(#/production)
  → 选择剧集
  → 画布节点链路：
       script（剧本）
     → scriptPlan（导演计划）
     → storyboardTable（分镜表 + 规则校验 RulePanel）
     → assets（衍生资产）
     → storyboard（分镜面板）
     → workbench（视频工作台，生成前 preflight）
```

### 关键 UI 位置

| 功能 | 位置 |
|------|------|
| 规则校验面板 | `storyboardTable` 节点底部 **规则校验** |
| Pipeline 闸门条 | `storyboardTable` 节点，RulePanel 上方 |
| 导入测试 JSON | 制作页左上角浮动工具栏 **上传图标** 按钮 |
| 视频生成预检 | `workbench` → 生成页，触达前 `preflightTouch` |

## 4. 测试 JSON 模板

仓库内预置模板（可直接打开复制）：

| 文件 | 用途 |
|------|------|
| `data/fixtures/script-bundle-template.json` | 外部 **ScriptBundle**（仅剧本，推荐） |
| `data/fixtures/flow-data-template.json` | 生产画布 `flowData`（剧本/分镜表/分镜面板） |
| `data/fixtures/episode-package-template.json` | 规则引擎 `EpisodePackage` 结构样例 |

### 4.0 ScriptBundle 导入（推荐）

制作页右下角 **导入 ScriptBundle**（`tf-adaptation-patch.js`），或 API：

```bash
curl -X POST http://localhost:10588/api/ruleEngine/importScript \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"projectId\":1,\"bundle\":$(cat data/fixtures/script-bundle-template.json),\"autoDesign\":true}"
```

导入后自动：写 `o_script` → autoDesign GB→SB→EN → 落库 `o_storyboard` → validate。

### 4.1 仅导入 flowData

将 `flow-data-template.json` 全文粘贴到「导入测试数据」对话框，勾选 **同步 EpisodePackage**，点击导入。

等价 API：

```bash
curl -X POST http://localhost:10588/api/production/saveFlowData \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":1,\"episodesId\":1,\"data\":{ ... flowData ... }}"
```

### 4.2 合并导入（flowData + package）

```json
{
  "flowData": { "...": "见 flow-data-template.json" },
  "package": { "...": "见 episode-package-template.json" }
}
```

导入时 `projectId` / `scriptId` 会自动替换为当前项目与所选剧集 ID。

### 4.3 导入后自动编译

勾选 **导入后执行 compileDryRun**，会调用：

```
POST /api/ruleEngine/compileDryRun
```

## 5. 规则引擎 API 速查

| 接口 | 说明 |
|------|------|
| `POST /api/ruleEngine/importScript` | ScriptBundle 导入 + autoDesign |
| `POST /api/ruleEngine/importBundle` | EpisodeBundle 全量导入 |
| `POST /api/ruleEngine/exportScriptBundle` | 导出 ScriptBundle |
| `POST /api/ruleEngine/exportBundle` | 导出 EpisodeBundle |
| `POST /api/ruleEngine/dryRunImport` | 导入预览 diff |
| `POST /api/ruleEngine/importSeries` | 多集 SeriesBundle |
| `POST /api/ruleEngine/autoDesignStatus` | autoDesign 任务进度 |
| `POST /api/ruleEngine/applyAutoFix` | 自动修复建议 |
| `POST /api/ruleEngine/generationFeedback` | 生成失败反馈路由 |
| `POST /api/ruleEngine/validate` | 校验当前集，返回 ValidationReport |
| `POST /api/ruleEngine/compileDryRun` | 干跑编译，不写库 |
| `POST /api/ruleEngine/saveEpisodePackage` | 同步或写入 package（body 可带 `package` 字段） |
| `POST /api/ruleEngine/getEpisodePackage` | 读取已存 package |
| `POST /api/ruleEngine/preflightTouch` | 视频触达前预检 |
| `POST /api/ruleEngine/getReport` | 覆盖率与阶段状态报告 |

请求体公共字段示例：

```json
{
  "projectId": 1,
  "scriptId": 1,
  "script": "...",
  "scriptPlan": "...",
  "storyboardTable": "| 镜 | 类型 | ...",
  "storyboard": []
}
```

## 6. 后端 CLI 测试

不启动浏览器也可验证规则引擎核心：

```bash
cd i:\toonflow\new\Toonflow-app
yarn test:rule-engine
```

预期：加载 262 条规则，golden 样例 compile 覆盖率 100%。

## 7. 启用规则引擎开关

设置项 `ruleEngineEnabled`（数据库 `o_setting`）为 `true` 时：

- `batchGenerateImage` / `batchGeneratePrompt` 使用 `EpisodePackage.compiled.*` 而非原始 prompt
- productionAgent 可使用 `compile_episode_prompts` 工具

## 8. 常见问题

| 现象 | 处理 |
|------|------|
| 侧边栏图标 0×0 | 确认 `registerIconPark.ts` 已注册 `i-folder-close` 等，并重新 `yarn build:integrate` |
| RulePanel 无数据 | 先选择剧集；`scriptId` 为空时不请求 |
| 登录 400 | 确认 `o_user` 有 admin 种子，重启后端 |
| API 404 | 确认 URL 含 `/api` 前缀 |
| 校验 BLOCK 过多 | 用模板 JSON 基线；或查看 `getReport` 覆盖率 |

## 9. 建议测试顺序

1. 登录 → 创建/打开项目 → 创建一集剧本
2. 制作页 → 导入 `flow-data-template.json`
3. 打开 `storyboardTable` 节点 → 查看 RulePanel 校验结果
4. 调用或勾选 compileDryRun → 确认 shots 编译输出
5. 进入 workbench → 尝试生成，观察 preflight 拦截/放行
6. `yarn test:rule-engine` 回归后端
7. `yarn test:bundle-roundtrip` ScriptBundle/EpisodeBundle 黄金路径
