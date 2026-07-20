# 02 — Golden contract

## LoopResult（schemaVersion=1）

| 字段 | 含义 |
|------|------|
| ok | 无 BLOCK 未通过项 |
| exhausted | 同 fingerprint 修不动或超 maxRounds |
| findings[].evidence | 结构化证据（禁止假绿：失败必须有 evidence） |
| decision.mode | ok \| soft_patch \| suggest \| human \| rePush |
| repairHint | 注入 missingSamples 后的 chatTemplate |
| verified | 曾执行 apply 后的再诊断 |

## 断言表（CI）

| 用例 | 断言 |
|------|------|
| dialogue-break diagnose | `passed=false`，`missingCount>=1`，message 含「缺」 |
| dialogue-break apply | `ok=true`，`verified=true` |
| filtered scope | `ok=true`，`shotScope=filtered` |
| H3 ↔ DC-01 | 同 bundle `missingCount` 一致 |

## Filtered scope（局部触达）

当 `storyboardIds` 过滤单镜时，以下检查不得用「全集 expected vs 局部 shots」误 BLOCK：

- DC-01 台词覆盖、DC-13 linkage.dialogue
- DC-03 markers、DC-04 emotion、DC-06 scene、DC-08 charCodes

证据仍保留（softBroken / WARN），全集预检仍严格 BLOCK。

## 与 quality-loop

语言/运镜/画面空泛等统一见 [`docs/quality-loop`](../quality-loop/README.md)；PrecheckLoop 负责 DC-01/DC-13/LANG-01 修复环。

## 禁止假绿

- 不得在 evidence 为空时宣称 PASS
- apply 后必须 re-diagnose
