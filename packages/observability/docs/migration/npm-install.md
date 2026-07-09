# 安装 @toonflow/observability

在 monorepo 内外引用 Toonflow 可观测性包的几种方式。

## 适用场景

- **Toonflow 主仓库**：Yarn workspaces 已链入 `packages/observability`
- **fork / 二次开发项目**：通过 `file:`、`git` 或未来 npm 安装
- **仅浏览器上报**：额外安装 `@toonflow/observability-browser`

## 前置条件

- Node.js ≥ 18，TypeScript 项目推荐 ≥ 5.0
- 包管理器：Yarn 1（主仓库 `packageManager: yarn@1.0.0`）或 npm/pnpm
- 主仓库 `tsconfig.json` 已配置路径别名（开发时直接指向源码）

## 完整代码

### 1. Yarn Workspace（Toonflow 主应用，推荐）

根目录 `package.json`：

```json
{
  "workspaces": ["packages/*"]
}
```

在应用 `package.json` 添加依赖：

```json
{
  "dependencies": {
    "@toonflow/observability": "1.0.0",
    "@toonflow/observability-browser": "1.0.0"
  }
}
```

安装：

```bash
cd /path/to/Toonflow-app
yarn install
```

TypeScript 路径（根 `tsconfig.json` 已有）：

```json
{
  "compilerOptions": {
    "paths": {
      "@toonflow/observability": ["packages/observability/src/index.ts"],
      "@toonflow/observability-browser": ["packages/observability-browser/src/index.ts"]
    }
  }
}
```

生产构建时 `scripts/build.ts` 将别名解析为打包路径：

```typescript
"@toonflow/observability": "./packages/observability/src/index.ts",
```

### 2. file: 本地路径（独立项目联调）

```bash
npm install /path/to/Toonflow-app/packages/observability
npm install /path/to/Toonflow-app/packages/observability-browser
```

或 `package.json`：

```json
{
  "dependencies": {
    "@toonflow/observability": "file:../Toonflow-app/packages/observability",
    "@toonflow/observability-browser": "file:../Toonflow-app/packages/observability-browser"
  }
}
```

### 3. git 依赖（远程仓库）

```json
{
  "dependencies": {
    "@toonflow/observability": "git+https://github.com/HBAI-Ltd/Toonflow-app.git#v1.1.8:packages/observability",
    "@toonflow/observability-browser": "git+https://github.com/HBAI-Ltd/Toonflow-app.git#v1.1.8:packages/observability-browser"
  }
}
```

> 注：monorepo 子路径 git 依赖依赖 npm/yarn 版本支持；不稳定时可 `git sparse-checkout` 仅拉取 `packages/observability`。

### 4. 未来 npm publish（规划中）

包元数据已就绪（`packages/observability/package.json`：`name`、`version`、`exports`）。发布后预期：

```bash
npm install @toonflow/observability @toonflow/observability-browser
```

```json
{
  "dependencies": {
    "@toonflow/observability": "^1.0.0",
    "@toonflow/observability-browser": "^1.0.0"
  }
}
```

子路径导出：

```typescript
import { traceMiddleware } from "@toonflow/observability/express";
import { createAiSdkAdapter } from "@toonflow/observability/ai-sdk";
import { createFromPreset } from "@toonflow/observability/presets";
```

### 5. CLI 初始化配置

```bash
yarn obs:init
# 或
npx @toonflow/observability-cli init --preset express --smart
```

生成 `observability.config.json`、`.env.observability.example`（见 `packages/observability-cli/src/init.ts`）。

### 6. 验证安装

```typescript
import { createObservability, createStdoutSink } from "@toonflow/observability";

const obs = createObservability({ appId: "install-test", logDir: "./logs" });
obs.registerSink(createStdoutSink());
await obs.log({ level: "info", category: "system", message: "install ok" });
```

```bash
yarn obs:test   # 运行 packages/observability 单元测试
```

## 预期输出

`yarn install` 后：

```
success Saved lockfile.
```

探针日志 stdout 一行 JSON，`message: "install ok"`。

`yarn obs:init` 输出：

```
Created observability.config.json
Created .env.observability.example
Done. preset=express smart=false
```

## FAQ

**Q1：为什么主应用 `package.json` 没有显式列 `@toonflow/observability`？**  
当前通过 workspaces + tsconfig paths + build 别名解析；子包 `name` 为 `@toonflow/observability`，yarn 会自动 hoist。独立项目请用 `file:` / git / 未来 npm 显式声明。

**Q2：`observability-browser` 能在 Node 里 import 吗？**  
该包依赖 `window`/`sessionStorage`，仅用于浏览器或小程序（自行 `wx.request`）。Node 侧用 `@toonflow/observability` 或 HTTP ingest。
