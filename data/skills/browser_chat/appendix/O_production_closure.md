---
name: appendix_O_production_closure
description: §6 制作实现闭环总览 + §14.11 扩展 + G56-G72 验收
rulePackVersion: "2.0.1"
---

# §6 制作实现闭环总览

## 五问对照

| # | 关切 | 机制 | Skill |
|---|------|------|-------|
| Q1 | 设计男/图视音女不一致 | identityAudit 跨 IMG/VID/AUD BLOCK | production_identity_audit |
| Q2 | 特效→prompt→AI 无法实现 | fxFeasibilityAudit F0–F5 + degradeFixPlan | production_fx_feasibility |
| Q3 | 分镜不合理反推 | PR-01~16 + rePushPlan | production_reasonableness_PR |
| Q4 | 故事因果正反向 | narrativeCausalityGraph | linkage_continuity + W3 |
| Q5 | 首次出场标准 | debutIntroPack + establishing | production_debut_intro |

## 合流（轨3）

设计走廊 → import → production_closure_checklist dryRun → validate INT → QualityGate → 生成 → generationFeedback → rePushPlan

## 验收 G56–G65

| # | 验收 |
|---|------|
| G56 | identityAudit：design male 时 IMG/VID/AUD 无 female 冲突 |
| G57 | fxFeasibility F5 镜不得 T3 未降级 export |
| G58 | F2 特效输出 degradeFixPlan + 用户确认流 |
| G59 | PR-01~08 BLOCK 触发 rePushPlan（非仅 fixPlan） |
| G60 | narrativeCausalityGraph 无 broken 或均有 reverseHints |
| G61 | 每主角色/主场景有 debutIntroPack 条目 |
| G62 | 首次出场镜 shotSize 含 establishing 类 |
| G63 | generationFeedback identity_mismatch → EN/BP |
| G64 | 内外 identityAudit schema 一致（Chat T3 = import dryRun） |
| G65 | golden「男设计/女 prompt」反例必 BLOCK |

---

# §14.11 扩展验证域（PR-09~16）

| ID | 域 | rePush |
|----|-----|--------|
| PR-09 | 唇形/时长与 lip 词 | SB / EN-VID |
| PR-10 | 画外音 OS | SB / EN-AUD |
| PR-11 | 道具状态链 | SB / BP |
| PR-12 | 空间关系跨模态 | SB / EN |
| PR-13 | 同场时空/色温 | SB / brief |
| PR-14 | 表情可实现 QF-EXPR | SB / EN |
| PR-15 | Vendor FX F5 | EN / SB / W3 |
| PR-16 | SUB 与 no-subtitles 冲突 | EN-MD / SB |

## T3 dryRun 十四项（G71/G73–G85）

见 `data/fixtures/production_closure_checklist.json` — Chat export 与 import dryRun **共用**。

PC-01~08：§14 制作闭环（identity/fx/PR/graph/debut/modality/hash/linkage）  
PC-09~14：§15 四模态触达（VID/AUD/IMG/FX slot + 跨模态 identity）

**§17 统一闭环**：`unified_closure_matrix.json` 合流 DC+PC+GC+IC；见 `appendix/T_unified_closure.md` 与 `yarn test:unified-closure-golden`（G86–G115）。

1. identityAudit 全镜 PASS  
2. fxFeasibilityAudit 无未处理 F5  
3. productionReasonableness PR 无 BLOCK  
4. narrativeCausalityGraph broken 为空或有 reverseHints  
5. debutIntroPack 主角色/主场景齐全（WARN 可记录）  
6. modalityPromptAudit T3 slot 合规  
7. externalHashCheck.match + linkageAudit 无 broken 链  
8. **PC-09** VID 首帧/时长/运镜  
9. **PC-10** AUD native/voice  
10. **PC-11** IMG cref/identity  
11. **PC-12** FX F4/F5  
12. **PC-13** 四 slot 齐全  
13. **PC-14** 跨模态 identity  

## 验收 G66–G85

| # | 验收 |
|---|------|
| G66 | PR-09：长台词 duration 与 lip 一致 |
| G67 | PR-10：OS 镜 AUD profile 正确 |
| G68 | PR-11/12 道具与 spatial 跨模态一致 |
| G69 | PR-14：emotion≥6 + duration&lt;4s BLOCK |
| G70 | PR-15：vendor F5 不得 silent pass |
| G71 | dryRun PC-01~14 全 PASS 才允许 export |
| G72 | golden 反例 dryRun 均 BLOCK |
| G73–G85 | 四模态触达见 appendix/P_modality_touch_four.md |
