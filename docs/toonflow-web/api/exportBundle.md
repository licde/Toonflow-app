# Toonflow Web · Bundle 导出 API

## 全量导出（推荐）

```http
POST /api/ruleEngine/exportFullBundle
Content-Type: application/json

{ "projectId": 1, "scriptId": 10 }
```

返回 Chat 同级 ScriptBundle：script、planData、preDesignPack（含 generation）、characterDesign、visualLockTable、flowData、Z108。

## 轻量导出

```http
POST /api/ruleEngine/exportScriptBundle
{ "projectId": 1, "scriptId": 10 }
```

仅 script + continuity + anchors。

## 验收（不挡 import）

```http
POST /api/ruleEngine/inspectBundle
{ "bundle": { ... }, "tier": "T3" }
```

关注 `chatPromptGaps`：对照 `docs/PROMPT_STANDARD.md` 报缺项。

## 导入

```http
POST /api/ruleEngine/importScript
{
  "projectId": 1,
  "bundle": { ... },
  "autoDesign": false
}
```

默认不 BLOCK；`validateOnly: true` 仅诊断。
