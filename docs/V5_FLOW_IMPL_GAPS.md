# Still→Video 流程实现缺口（2026-07-30 排查）

## 已修（本轮 + 文学主导闭环）

| 缺口 | 修复 |
|------|------|
| contact_geom L0 缺 `禁纸入口` 假红弱图 | compose untilClear mouthBan + 纸未入口/仅颊触等价；egress 写 `coverageForGate` |
| sceneColorLock 字符串 `"寝殿":"4500K"` 未消费 | `resolveColorTempFromCtx` 双形态 |
| spatialRelation 对象 dump | 统一 `站位：` |
| faceCu drop 后灰棚无软氛围 | bgGuidance + **softEnv 参考板**（`keepSoftEnvRef`） |
| demote/drop 下 atmosphere 修复被零化 | repairRoute 保留 VD 氛围失败 |
| 视频「需完善·不可烧」死按钮 | 可点→自动重编译；一键自愈 SPEC OK 可点 |
| 厂商错误闩 `blockSilentRegen` | 前序已修 |
| CU 丢 SCENE → 灰棚首帧 | ShotModalityIntent `soft_env` + referenceList 保留 1 张环境板 |
| inventory untilClear 无 live handler | UntilClearRuntime + mount graph（BG/CONTACT/HQ_EGRESS） |
| theme-glue 带红 seal | seal 仅 audit PASS |
| SelfHeal 只清清单 | smartRepairActuators → compose_regen / fidelity_edit |
| softAllow 伪造 visualPass | postBurn 仅 `hq_ok` 可 stamp VP |
| GAP-STILL-HQ-CASCADE | `cascadeTrackAfterStillHqOk` |
| GAP-SELFHEAL-FIDELITY（phase1） | SelfHeal 路由像素债 → batch_still |

## 仍须跟进（未完全 untilClear）

| id | 现象 | 建议 |
|----|------|------|
| GAP-PIXEL-GEOM | VLM 像素级 contact_geom（需 Key） | handler 已接 RepairAsDesign inject；untilClear 预算后软 CTA |
| untilClear phase2 | 其余 inventory 债类仅挂账 | `until_clear_deferred_classes.json` |

## 本轮已关（可拍优先 · 修复即设计）

| id | 修复 |
|----|------|
| GAP-EPISODE-WEAK | `auditEpisodeStillReadiness` → healQueue + burnableIds，不砖整集 |
| GAP-SOFT-DEFER-QD | `QualityDecisionResult.softDefer` / `softDeferRaiseAllowed` 与 burnAllowed 分态 |
| 文学闩挡生成 | lit HQ → advise+slim；`blockSilentRegen` 永不因 split/lit 闩死 |
| 写回不重编译 | `regenerateModalityPromptsAfterDesign` 接 IRD/applyCascade |
| 父 VD 回灌 | XOR 子镜独立 clientId；designLoss/splitChild 禁双接触父汤 |

## 政策边界（不应假绿）

- soft_deliver ≠ videoPass / hq_ok
- XOR 双接触：建议智拆并生成；试拍可放行，烧片前须对齐（requireFixBeforeBurn）
- 灰棚像素失败禁人审直接 hq_ok
- redesignPass ≠ 智能修复完成
- IMPORT_OK ≠ designExitPass
- blockSilentRegen 仅真不可拍（缺定妆）；文学债不灰生成
