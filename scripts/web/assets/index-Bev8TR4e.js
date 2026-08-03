import { u as useAdaptationNav, b as useProductionAgentStore } from './useAdaptationNav-BJTPyVmA.js';
import { dryRunImport, importHeal, importScriptBundle } from './ruleEngine-l0rUVBgW.js';
import { l as defineComponent, aK as openBlock, aL as createElementBlock, aO as createBaseVNode, b0 as toDisplayString, aT as createCommentVNode, F as Fragment, aP as renderList, aU as normalizeClass, a$ as createTextVNode, a1 as unref, r as ref, c as computed, bU as useModel, aS as createBlock, aM as withCtx, j as createVNode, bV as mergeModels } from './vue-vendor-Byo5TD6r.js';
import { _ as _export_sfc } from './index-Dj17DntQ.js';
import { i as instance } from './axios-DoLZCC01.js';
import { t as toastAfterApplyExitGate } from './v5OpsHelpers-D73C6JE9.js';
import { T as Textarea, a0 as Upload, B as Button, a3 as Checkbox, af as RadioGroup, ag as RadioButton, A as Alert, E as Dialog } from './tdesign-CfL1pweZ.js';
import './markdown-CDQfeHxT.js';
import './dayjs-CuToSpIM.js';
import './i18n-C05S5xzz.js';

function forkLabel(fork) {
  if (fork === "fork-A") return "改 W3 △ 叙事描述";
  if (fork === "fork-B") return "改 SB spatialRelation 镜级";
  return "";
}
const CLOSURE_DIMENSION_LABELS = {
  dc: "设计闭环 DC",
  pc: "制作闭环 PC",
  gc: "生成闭环 GC",
  ic: "智能修复 IC"
};

const _hoisted_1$1 = {
  key: 0,
  class: "rule-panel rule-panel--loading"
};
const _hoisted_2$1 = {
  key: 1,
  class: "rule-panel rule-panel--empty"
};
const _hoisted_3$1 = {
  key: 2,
  class: "rule-panel"
};
const _hoisted_4$1 = {
  key: 0,
  class: "rule-panel__banner"
};
const _hoisted_5$1 = {
  key: 0,
  class: "rule-panel__primary-hint"
};
const _hoisted_6$1 = {
  key: 1,
  class: "rule-panel__block-ids"
};
const _hoisted_7$1 = {
  key: 2,
  class: "rule-panel__primary-hint"
};
const _hoisted_8$1 = {
  key: 1,
  class: "rule-panel__banner rule-panel__banner--ok"
};
const _hoisted_9$1 = {
  key: 2,
  class: "rule-panel__banner rule-panel__banner--ok"
};
const _hoisted_10$1 = {
  key: 3,
  class: "rule-panel__section rule-panel__section--salvage"
};
const _hoisted_11 = { key: 0 };
const _hoisted_12 = { key: 1 };
const _hoisted_13 = {
  key: 2,
  class: "rule-panel__heal-log"
};
const _hoisted_14 = {
  key: 4,
  class: "rule-panel__section"
};
const _hoisted_15 = {
  key: 5,
  class: "rule-panel__section"
};
const _hoisted_16 = {
  key: 6,
  class: "rule-panel__section"
};
const _hoisted_17 = {
  key: 7,
  class: "rule-panel__section"
};
const _hoisted_18 = {
  key: 8,
  class: "rule-panel__section"
};
const _hoisted_19 = { class: "rule-panel__tabs" };
const _hoisted_20 = ["onClick"];
const _hoisted_21 = {
  key: 0,
  class: "rule-panel__badge"
};
const _hoisted_22 = { class: "rule-panel__checks" };
const _hoisted_23 = {
  key: 9,
  class: "rule-panel__section"
};
const _hoisted_24 = {
  key: 10,
  class: "rule-panel__section"
};
const _hoisted_25 = {
  key: 11,
  class: "rule-panel__section"
};
const _hoisted_26 = {
  key: 12,
  class: "rule-panel__section"
};
const _hoisted_27 = { class: "rule-panel__fork" };
const _hoisted_28 = {
  key: 0,
  class: "rule-panel__fork-row"
};
const _hoisted_29 = ["onClick"];
const _hoisted_30 = {
  key: 1,
  class: "rule-panel__fork-row"
};
const _hoisted_31 = ["onClick"];
const _hoisted_32 = ["onClick"];
const _hoisted_33 = {
  key: 13,
  class: "rule-panel__section"
};
const _hoisted_34 = { class: "rule-panel__section-header" };
const _hoisted_35 = ["onClick"];
const _hoisted_36 = {
  key: 14,
  class: "rule-panel__section"
};
const _hoisted_37 = {
  key: 0,
  class: "rule-panel__fork"
};
const _hoisted_38 = ["onClick"];
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "RulePanel",
  props: {
    result: {},
    loading: { type: Boolean },
    shapeSalvageLog: {},
    serverFixedIds: {},
    chatMustFixIds: {},
    exportAllowed: { type: [Boolean, null] },
    chatRepairText: {},
    userMessage: {},
    ctaLabel: {},
    primaryNextStep: {},
    healLog: {},
    smartDesignProposals: {}
  },
  emits: ["copyChat", "copyAllChat", "rePush", "applyDc01SoftPatch", "applyEmotionStructureHeal", "confirmSmartProposal", "rejectSmartProposal", "applySmartProposals", "presentationFork"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const emit = __emit;
    const activeTab = ref("dc");
    const copyFlash = ref(false);
    const dimensions = ["dc", "pc", "gc", "ic"];
    const showDc01SoftPatchCta = computed(() => {
      const plan = props.result?.rePushPlan ?? [];
      return plan.some(
        (p) => p.trigger === "dialogue_hash_mismatch" || /dialogue_hash_mismatch/i.test(String(p.trigger || p.reason || ""))
      );
    });
    const showEmotionStructureHealCta = computed(() => {
      const plan = props.result?.rePushPlan ?? [];
      return plan.some((p) => {
        const t = String(p.trigger || p.reason || "");
        return /emotion_structure|cam_style|cluster|structure_stale|svq_|motion_mismatch/i.test(t) || p.reverseTarget === "EN" && /CAM|PR-CAM|structure/i.test(t);
      });
    });
    const pendingProposals = computed(() => {
      const fromProp = props.smartDesignProposals ?? [];
      const fromResult = props.result?.smartDesignProposals ?? [];
      const list = fromProp.length ? fromProp : fromResult;
      return list.filter((p) => p.status === "pending_user_confirm" || p.status === "confirmed");
    });
    const confirmedCount = computed(
      () => pendingProposals.value.filter((p) => p.status === "confirmed").length
    );
    function rePushLabel(p) {
      const trigger = String(p.trigger || p.reason || "");
      if (trigger === "runtime_type_error" || /is not a function|TypeError/i.test(trigger)) {
        return "运行时异常 → 重试生成（非台词保真）";
      }
      if (trigger === "dialogue_hash_mismatch" || /dialogue_hash_mismatch/i.test(trigger)) {
        return "分镜台词与剧本对不上 → 补台词后再生成";
      }
      if (/emotion_structure|structure_stale|cam_style|cluster/i.test(trigger)) {
        return "情绪结构待补齐 → 按当前风格自愈（不改台词）";
      }
      if (p.reverseTarget === "INFRA") {
        return trigger ? `${trigger} → 检查环境后重试` : "基础设施异常 → 重试";
      }
      if (p.reverseTarget === "SB" && /CAM|structure|emotion/i.test(trigger)) {
        return "分镜结构问题 → 一键按当前情绪风格补齐";
      }
      const target = p.reverseTarget ? ` → ${p.reverseTarget}` : "";
      return `${trigger || "回推"}${target}`;
    }
    const isBlocked = computed(() => {
      if (props.exportAllowed === false) return true;
      if (props.exportAllowed === true) return false;
      return Boolean(props.result?.blocked);
    });
    const checksForTab = computed(() => {
      if (!props.result) return [];
      const list = props.result.closureChecks[activeTab.value] ?? [];
      return [...list].sort((a, b) => {
        const sa = a.passed ? 2 : a.severity === "BLOCK" ? 0 : 1;
        const sb = b.passed ? 2 : b.severity === "BLOCK" ? 0 : 1;
        return sa - sb;
      });
    });
    const optimizeCount = computed(() => {
      if (!props.result) return 0;
      const cr = props.result.closureReport;
      return (cr?.optimize?.length ?? 0) + (cr?.missing?.length ?? 0) + (props.result.warnings?.length ?? 0);
    });
    const salvageSummary = computed(() => {
      const log = props.shapeSalvageLog ?? [];
      if (!log.length) return "";
      const byRule = /* @__PURE__ */ new Map();
      for (const e of log) byRule.set(e.ruleId, (byRule.get(e.ruleId) ?? 0) + 1);
      return [...byRule.entries()].map(([id, n]) => `${id}×${n}`).join(" · ");
    });
    const serverFixedSet = computed(() => new Set(props.serverFixedIds ?? []));
    const chatMustHints = computed(() => {
      const hints = props.result?.repairHints ?? [];
      const must = props.chatMustFixIds;
      if (!must?.length) {
        if ((props.shapeSalvageLog ?? []).some((e) => e.ruleId.includes("VISUAL-EFFECT"))) {
          return hints.filter((h) => h.id !== "RH-MOD-01" && !String(h.chatTemplate ?? "").includes("visualEffect as a string"));
        }
        return hints;
      }
      const mustSet = new Set(must);
      return hints.filter((h) => mustSet.has(h.id) || h.ruleId && mustSet.has(h.ruleId) || mustSet.has(String(h.ruleId ?? "")));
    });
    const serverFixedHints = computed(() => {
      const hints = props.result?.repairHints ?? [];
      const fixed = serverFixedSet.value;
      if (!fixed.size && !(props.shapeSalvageLog ?? []).length) return [];
      return hints.filter((h) => fixed.has(h.id) || h.ruleId && fixed.has(h.ruleId));
    });
    function checkClass(c) {
      if (c.passed) return "rule-panel__check--pass";
      if (c.severity === "BLOCK") return "rule-panel__check--block";
      return "rule-panel__check--warn";
    }
    function forkLabel$1(fork) {
      return forkLabel(fork);
    }
    function onCopy(h) {
      if (h.chatTemplate) emit("copyChat", h.chatTemplate);
    }
    const allChatText = computed(() => {
      if (!props.result) return "";
      const direct = props.chatRepairText?.trim() || props.result.chatRepairText?.trim();
      if (direct) return direct;
      const uniqueIds = props.chatMustFixIds?.length ? props.chatMustFixIds : [
        ...dimensions.flatMap(
          (d) => (props.result?.closureChecks[d] ?? []).filter((c) => c.passed === false).map((c) => c.id)
        ),
        ...(props.result.qualityGate?.blocks ?? []).map((i) => i.id) ?? []
      ];
      const hintLines = chatMustHints.value.map((h) => h.chatTemplate ? `[${h.id}] ${h.chatTemplate}` : "").filter(Boolean);
      const fallbackHints = (props.result.repairHints ?? []).slice(0, 20).map((h) => h.chatTemplate ? `[${h.id}] ${h.chatTemplate}` : "").filter(Boolean);
      return [
        "【闭环修复清单 — 请按项修改 JSON 字段，勿只改 audit 自报】",
        `待处理规则：${[...new Set(uniqueIds)].join(", ") || "无"}`,
        "",
        ...hintLines.length ? hintLines : fallbackHints,
        "",
        "改完后重新 dryRun/exportGate 再导入；merge 保持 preserveMedia。回推舞台仅跳转，不改数据。"
      ].join("\n");
    });
    const morphClosed = computed(
      () => props.exportAllowed === true && !(props.chatMustFixIds ?? []).length
    );
    const blockIdLine = computed(() => {
      const ids = [
        ...props.chatMustFixIds ?? [],
        ...dimensions.flatMap(
          (d) => (props.result?.closureChecks[d] ?? []).filter((c) => !c.passed && c.severity === "BLOCK").map((c) => c.id)
        ),
        ...(props.result?.qualityGate?.blocks ?? []).map((i) => i.id) ?? []
      ];
      const uniq = [...new Set(ids.filter(Boolean))];
      return uniq.length ? `规则：${uniq.slice(0, 12).join(", ")}${uniq.length > 12 ? "…" : ""}` : "";
    });
    const primaryBlockHint = computed(() => {
      const text = allChatText.value;
      const m = text.match(/【孤儿场】[^\n]+|【场镜基数】[^\n]+|【幽灵场】[^\n]+|【主因·结构】[^\n]+/);
      if (m) return `主因：${m[0].replace(/^【主因·结构】/, "").trim().slice(0, 120)}`;
      const firstMust = props.chatMustFixIds?.[0];
      return firstMust ? `主因规则：${firstMust}` : "";
    });
    function onCopyFullBrief() {
      const text = allChatText.value.trim();
      if (!text) return;
      emit("copyAllChat", text);
      copyFlash.value = true;
      setTimeout(() => {
        copyFlash.value = false;
      }, 1600);
    }
    return (_ctx, _cache) => {
      return __props.loading ? (openBlock(), createElementBlock("div", _hoisted_1$1, "闭环检测中…")) : !__props.result ? (openBlock(), createElementBlock("div", _hoisted_2$1, "暂无闭环数据")) : (openBlock(), createElementBlock("div", _hoisted_3$1, [
        isBlocked.value ? (openBlock(), createElementBlock("div", _hoisted_4$1, [
          createBaseVNode("div", null, [
            createBaseVNode("div", null, toDisplayString(__props.userMessage || "阻断 — 请先完善") + " · rulePack " + toDisplayString(__props.result.rulePackVersion) + " · " + toDisplayString(__props.result.tier), 1),
            __props.ctaLabel ? (openBlock(), createElementBlock("div", _hoisted_5$1, "主按钮：" + toDisplayString(__props.ctaLabel) + "（" + toDisplayString(__props.primaryNextStep || "chat_repair") + "）", 1)) : createCommentVNode("", true),
            !__props.userMessage && blockIdLine.value ? (openBlock(), createElementBlock("div", _hoisted_6$1, toDisplayString(blockIdLine.value), 1)) : createCommentVNode("", true),
            !__props.userMessage && primaryBlockHint.value ? (openBlock(), createElementBlock("div", _hoisted_7$1, toDisplayString(primaryBlockHint.value), 1)) : createCommentVNode("", true)
          ]),
          allChatText.value.trim() ? (openBlock(), createElementBlock("button", {
            key: 0,
            type: "button",
            class: "rule-panel__copy-primary",
            onClick: onCopyFullBrief
          }, toDisplayString(copyFlash.value ? "已复制" : __props.ctaLabel || "复制闭环修复清单"), 1)) : createCommentVNode("", true)
        ])) : morphClosed.value ? (openBlock(), createElementBlock("div", _hoisted_8$1, " 形态已闭环，剩余为可选优化 · rulePack " + toDisplayString(__props.result.rulePackVersion) + " · " + toDisplayString(__props.result.tier), 1)) : (openBlock(), createElementBlock("div", _hoisted_9$1, toDisplayString(optimizeCount.value ? `${optimizeCount.value} 项待优化（不阻断导入）` : "闭环通过") + " · rulePack " + toDisplayString(__props.result.rulePackVersion) + " · " + toDisplayString(__props.result.tier), 1)),
        salvageSummary.value || __props.serverFixedIds?.length || __props.healLog?.length ? (openBlock(), createElementBlock("section", _hoisted_10$1, [
          _cache[3] || (_cache[3] = createBaseVNode("h4", null, "已自动完善（可展开追溯）", -1)),
          salvageSummary.value ? (openBlock(), createElementBlock("p", _hoisted_11, toDisplayString(salvageSummary.value), 1)) : createCommentVNode("", true),
          __props.serverFixedIds?.length ? (openBlock(), createElementBlock("ul", _hoisted_12, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(__props.serverFixedIds, (id) => {
              return openBlock(), createElementBlock("li", { key: id }, toDisplayString(id), 1);
            }), 128))
          ])) : createCommentVNode("", true),
          __props.healLog?.length ? (openBlock(), createElementBlock("details", _hoisted_13, [
            createBaseVNode("summary", null, "修复日志 " + toDisplayString(__props.healLog.length) + " 条", 1),
            createBaseVNode("ul", null, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(__props.healLog, (e, i) => {
                return openBlock(), createElementBlock("li", { key: i }, toDisplayString(e.ruleId) + " · " + toDisplayString(e.action) + toDisplayString(e.detail ? ` · ${e.detail}` : ""), 1);
              }), 128))
            ])
          ])) : createCommentVNode("", true)
        ])) : createCommentVNode("", true),
        __props.result.closureReport?.missing?.length ? (openBlock(), createElementBlock("section", _hoisted_14, [
          _cache[4] || (_cache[4] = createBaseVNode("h4", null, "缺失项", -1)),
          createBaseVNode("ul", null, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(__props.result.closureReport.missing, (m, i) => {
              return openBlock(), createElementBlock("li", { key: i }, toDisplayString(m), 1);
            }), 128))
          ])
        ])) : createCommentVNode("", true),
        __props.result.chatPromptGaps?.length ? (openBlock(), createElementBlock("section", _hoisted_15, [
          _cache[5] || (_cache[5] = createBaseVNode("h4", null, "Chat 提示词", -1)),
          createBaseVNode("ul", null, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(__props.result.chatPromptGaps, (g) => {
              return openBlock(), createElementBlock("li", {
                key: g.id + (g.shotIndex ?? "")
              }, " [" + toDisplayString(g.severity) + "] " + toDisplayString(g.shotIndex ? `镜${g.shotIndex} ` : "") + toDisplayString(g.message), 1);
            }), 128))
          ])
        ])) : createCommentVNode("", true),
        __props.result.modalityGaps?.length ? (openBlock(), createElementBlock("section", _hoisted_16, [
          _cache[6] || (_cache[6] = createBaseVNode("h4", null, "模态链", -1)),
          createBaseVNode("ul", null, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(__props.result.modalityGaps, (g, i) => {
              return openBlock(), createElementBlock("li", { key: i }, toDisplayString(g.id) + ": " + toDisplayString(g.message), 1);
            }), 128))
          ])
        ])) : createCommentVNode("", true),
        __props.result.qualityGate?.issues?.length ? (openBlock(), createElementBlock("section", _hoisted_17, [
          _cache[7] || (_cache[7] = createBaseVNode("h4", null, "统一质量闸", -1)),
          createBaseVNode("ul", null, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(__props.result.qualityGate.issues.slice(0, 20), (g, i) => {
              return openBlock(), createElementBlock("li", {
                key: `${g.id}-${i}`
              }, " [" + toDisplayString(g.severity) + "] " + toDisplayString(g.shotIndex ? `镜${g.shotIndex} ` : "") + toDisplayString(g.id) + ": " + toDisplayString(g.message), 1);
            }), 128))
          ])
        ])) : createCommentVNode("", true),
        __props.result.warnings?.length ? (openBlock(), createElementBlock("section", _hoisted_18, [
          _cache[8] || (_cache[8] = createBaseVNode("h4", null, "提示", -1)),
          createBaseVNode("ul", null, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(__props.result.warnings.slice(0, 20), (w, i) => {
              return openBlock(), createElementBlock("li", { key: i }, toDisplayString(w), 1);
            }), 128))
          ])
        ])) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_19, [
          (openBlock(), createElementBlock(Fragment, null, renderList(dimensions, (d) => {
            return createBaseVNode("button", {
              key: d,
              type: "button",
              class: normalizeClass(["rule-panel__tab", { "rule-panel__tab--active": activeTab.value === d }]),
              onClick: ($event) => activeTab.value = d
            }, [
              createTextVNode(toDisplayString(unref(CLOSURE_DIMENSION_LABELS)[d]) + " ", 1),
              __props.result.closureChecks[d].some((c) => !c.passed && c.severity === "BLOCK") ? (openBlock(), createElementBlock("span", _hoisted_21, "!")) : createCommentVNode("", true)
            ], 10, _hoisted_20);
          }), 64))
        ]),
        createBaseVNode("ul", _hoisted_22, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(checksForTab.value, (c) => {
            return openBlock(), createElementBlock("li", {
              key: c.id,
              class: normalizeClass(["rule-panel__check", checkClass(c)])
            }, [
              createBaseVNode("strong", null, toDisplayString(c.id), 1),
              createBaseVNode("span", null, toDisplayString(c.message ?? (c.passed ? "PASS" : "FAIL")), 1)
            ], 2);
          }), 128))
        ]),
        serverFixedHints.value.length ? (openBlock(), createElementBlock("section", _hoisted_23, [
          _cache[9] || (_cache[9] = createBaseVNode("h4", null, "已服务端修复（无需再复制）", -1)),
          (openBlock(true), createElementBlock(Fragment, null, renderList(serverFixedHints.value, (h) => {
            return openBlock(), createElementBlock("div", {
              key: "fixed-" + h.id,
              class: "rule-panel__hint-card rule-panel__hint-card--done"
            }, [
              createBaseVNode("code", null, toDisplayString(h.id), 1),
              createBaseVNode("p", null, toDisplayString(h.chatTemplate), 1)
            ]);
          }), 128))
        ])) : createCommentVNode("", true),
        showDc01SoftPatchCta.value ? (openBlock(), createElementBlock("section", _hoisted_24, [
          _cache[10] || (_cache[10] = createBaseVNode("h4", null, "台词覆盖", -1)),
          _cache[11] || (_cache[11] = createBaseVNode("p", { class: "rule-panel__dc01-msg" }, "分镜台词与剧本对不上，可一键把缺失台词补进空镜后再生成。", -1)),
          createBaseVNode("button", {
            type: "button",
            class: "rule-panel__copy-primary",
            onClick: _cache[0] || (_cache[0] = ($event) => emit("applyDc01SoftPatch"))
          }, " 一键补台词 ")
        ])) : createCommentVNode("", true),
        showEmotionStructureHealCta.value ? (openBlock(), createElementBlock("section", _hoisted_25, [
          _cache[12] || (_cache[12] = createBaseVNode("h4", null, "情绪结构", -1)),
          _cache[13] || (_cache[13] = createBaseVNode("p", { class: "rule-panel__dc01-msg" }, "只更新情绪契约与分镜结构，不修改台词原文。设计期应已出站；此处为漏网兜底。", -1)),
          createBaseVNode("button", {
            type: "button",
            class: "rule-panel__copy-primary",
            onClick: _cache[1] || (_cache[1] = ($event) => emit("applyEmotionStructureHeal"))
          }, " 按当前题材公式补齐结构 ")
        ])) : createCommentVNode("", true),
        pendingProposals.value.length ? (openBlock(), createElementBlock("section", _hoisted_26, [
          _cache[14] || (_cache[14] = createBaseVNode("h4", null, "智能提案 Confirm（W93）", -1)),
          _cache[15] || (_cache[15] = createBaseVNode("p", { class: "rule-panel__dc01-msg" }, "须先确认路径，再一键 apply 写库；未 Confirm 禁止假绿出站。", -1)),
          (openBlock(true), createElementBlock(Fragment, null, renderList(pendingProposals.value, (sp) => {
            return openBlock(), createElementBlock("div", {
              key: sp.id || sp.ruleId,
              class: "rule-panel__repush"
            }, [
              createBaseVNode("div", null, [
                createBaseVNode("strong", null, toDisplayString(sp.ruleId), 1),
                createBaseVNode("span", null, " · " + toDisplayString(sp.proposal), 1),
                createBaseVNode("span", _hoisted_27, toDisplayString(sp.status) + " → " + toDisplayString(sp.targetStage), 1)
              ]),
              sp.presentationFork?.length ? (openBlock(), createElementBlock("div", _hoisted_28, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(sp.presentationFork, (f) => {
                  return openBlock(), createElementBlock("button", {
                    key: f.fork,
                    type: "button",
                    class: "rule-panel__copy-primary",
                    onClick: ($event) => {
                      emit("presentationFork", { proposalId: sp.id || sp.ruleId, fork: f.fork });
                      emit("confirmSmartProposal", { proposalId: sp.id || sp.ruleId, fork: f.fork });
                    }
                  }, toDisplayString(f.label), 9, _hoisted_29);
                }), 128))
              ])) : (openBlock(), createElementBlock("div", _hoisted_30, [
                createBaseVNode("button", {
                  type: "button",
                  class: "rule-panel__copy-primary",
                  onClick: ($event) => emit("confirmSmartProposal", { proposalId: sp.id || sp.ruleId })
                }, " Confirm ", 8, _hoisted_31),
                createBaseVNode("button", {
                  type: "button",
                  onClick: ($event) => emit("rejectSmartProposal", { proposalId: sp.id || sp.ruleId })
                }, " 拒绝 ", 8, _hoisted_32)
              ]))
            ]);
          }), 128)),
          confirmedCount.value ? (openBlock(), createElementBlock("button", {
            key: 0,
            type: "button",
            class: "rule-panel__copy-primary",
            onClick: _cache[2] || (_cache[2] = ($event) => emit("applySmartProposals"))
          }, " Apply 已确认提案写库（" + toDisplayString(confirmedCount.value) + "） ", 1)) : createCommentVNode("", true)
        ])) : createCommentVNode("", true),
        chatMustHints.value.length || isBlocked.value && allChatText.value.trim() ? (openBlock(), createElementBlock("section", _hoisted_33, [
          createBaseVNode("div", _hoisted_34, [
            _cache[16] || (_cache[16] = createBaseVNode("h4", null, "需 Chat 修改", -1)),
            createBaseVNode("button", {
              type: "button",
              onClick: onCopyFullBrief
            }, toDisplayString(copyFlash.value ? "已复制" : "复制闭环修复清单"), 1)
          ]),
          (openBlock(true), createElementBlock(Fragment, null, renderList(chatMustHints.value, (h) => {
            return openBlock(), createElementBlock("div", {
              key: h.id,
              class: "rule-panel__hint-card"
            }, [
              createBaseVNode("code", null, toDisplayString(h.id), 1),
              createBaseVNode("p", null, toDisplayString(h.chatTemplate), 1),
              createBaseVNode("button", {
                type: "button",
                onClick: ($event) => onCopy(h)
              }, "复制到 Chat", 8, _hoisted_35)
            ]);
          }), 128))
        ])) : createCommentVNode("", true),
        __props.result.rePushPlan?.length ? (openBlock(), createElementBlock("section", _hoisted_36, [
          _cache[17] || (_cache[17] = createBaseVNode("h4", null, "回推计划", -1)),
          (openBlock(true), createElementBlock(Fragment, null, renderList(__props.result.rePushPlan, (p, i) => {
            return openBlock(), createElementBlock("div", {
              key: i,
              class: "rule-panel__repush"
            }, [
              createBaseVNode("span", null, toDisplayString(rePushLabel(p)), 1),
              p.presentationFork ? (openBlock(), createElementBlock("span", _hoisted_37, toDisplayString(forkLabel$1(p.presentationFork)), 1)) : createCommentVNode("", true),
              createBaseVNode("button", {
                type: "button",
                onClick: ($event) => emit("rePush", p)
              }, "回推 " + toDisplayString(p.reverseTarget) + "（仅跳转，未改数据）", 9, _hoisted_38)
            ]);
          }), 128))
        ])) : createCommentVNode("", true)
      ]));
    };
  }
});

/* unplugin-vue-components disabled */

const ClosureRulePanel = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-30a61c35"]]);

const _hoisted_1 = { class: "importScriptBundle" };
const _hoisted_2 = { class: "hint" };
const _hoisted_3 = { class: "actions f ac" };
const _hoisted_4 = { class: "preview-row" };
const _hoisted_5 = { key: 0 };
const _hoisted_6 = {
  key: 1,
  class: "block-ids"
};
const _hoisted_7 = {
  key: 2,
  class: "primary-hint"
};
const _hoisted_8 = { key: 3 };
const _hoisted_9 = { key: 4 };
const _hoisted_10 = { key: 5 };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: /* @__PURE__ */ mergeModels({
    projectId: {},
    scriptId: {}
  }, {
    "visible": { type: Boolean, ...{ default: false } },
    "visibleModifiers": {}
  }),
  emits: /* @__PURE__ */ mergeModels(["imported"], ["update:visible"]),
  setup(__props, { emit: __emit }) {
    const { goDesignStage } = useAdaptationNav();
    function onRePush(item) {
      window.$message.info("回推仅跳转设计台，未修改当前导入数据");
      goDesignStage(item.reverseTarget, item.trigger);
    }
    const props = __props;
    const emit = __emit;
    const visible = useModel(__props, "visible");
    const jsonText = ref("");
    const autoDesign = ref(true);
    const mergeStrategy = ref("preserveMedia");
    const loading = ref(false);
    const previewLoading = ref(false);
    const healLoading = ref(false);
    const previewSummary = ref(null);
    const closurePreview = ref(null);
    const lastBundle = ref(null);
    const shapeSalvageLog = ref([]);
    const serverFixedIds = ref([]);
    const chatMustFixIds = ref([]);
    const exportAllowed = ref(null);
    const chatRepairText = ref("");
    const smartDesignProposals = ref([]);
    const smartProposalLoading = ref(false);
    const salvageBanner = computed(() => {
      const log = shapeSalvageLog.value;
      if (!log.length) return "";
      const ve = log.filter((e) => e.ruleId === "SH-VISUAL-EFFECT-OBJ").length;
      if (ve) return `已自动修复 ${ve} 处 visualEffect 对象→字符串`;
      return `已自动修复 ${log.length} 处形态问题`;
    });
    const blockIdsBanner = computed(() => {
      const ids = chatMustFixIds.value.filter(Boolean);
      if (!ids.length) return "";
      const head = ids.slice(0, 10).join(", ");
      return `规则：${head}${ids.length > 10 ? "…" : ""}`;
    });
    const healPrimary = ref(null);
    const healLog = ref([]);
    const primaryBlockHint = computed(() => {
      if (healPrimary.value?.userMessage) {
        return `${healPrimary.value.userMessage}${healPrimary.value.ctaLabel ? ` → ${healPrimary.value.ctaLabel}` : ""}`;
      }
      const text = chatRepairText.value;
      const m = text.match(/【孤儿场】[^\n]+|【场镜基数】[^\n]+|【幽灵场】[^\n]+/);
      if (m) return `主因：${m[0].slice(0, 120)}`;
      const first = chatMustFixIds.value[0];
      return first ? `主因规则：${first}` : "";
    });
    function onCopyChat(text) {
      void navigator.clipboard?.writeText(text);
      window.$message.success("已复制修复话术");
    }
    function onCopyAllChat(text) {
      void navigator.clipboard?.writeText(text);
      window.$message.success("已复制闭环修复清单");
    }
    function parseBundle(text) {
      const raw = JSON.parse(text);
      if (!raw || typeof raw !== "object") throw new Error("invalid json");
      return raw;
    }
    function onFileChange(files) {
      const file = files[0]?.raw;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        jsonText.value = String(reader.result ?? "");
        previewSummary.value = null;
      };
      reader.readAsText(file);
    }
    function resetState() {
      jsonText.value = "";
      previewSummary.value = null;
      closurePreview.value = null;
      lastBundle.value = null;
      shapeSalvageLog.value = [];
      serverFixedIds.value = [];
      chatMustFixIds.value = [];
      exportAllowed.value = null;
      chatRepairText.value = "";
      smartDesignProposals.value = [];
      autoDesign.value = true;
      mergeStrategy.value = "preserveMedia";
    }
    function onClose() {
      resetState();
    }
    function onCancel() {
      visible.value = false;
      resetState();
    }
    async function onDryRun() {
      if (!jsonText.value.trim()) {
        window.$message.warning($t("workbench.production.importScriptBundle.empty"));
        return;
      }
      previewLoading.value = true;
      try {
        const bundle = parseBundle(jsonText.value);
        lastBundle.value = bundle;
        const summary = await dryRunImport({
          projectId: props.projectId,
          bundle,
          targetScriptId: props.scriptId,
          mergeStrategy: mergeStrategy.value
        });
        previewSummary.value = summary;
        closurePreview.value = summary.preImport ?? null;
        smartDesignProposals.value = summary.preImport?.smartDesignProposals ?? summary.smartDesignProposals ?? [];
        shapeSalvageLog.value = summary.shapeSalvageLog ?? summary.exportGate?.shapeSalvageLog ?? [];
        exportAllowed.value = summary.exportGate?.exportAllowed ?? !summary.preImport?.blocked;
        chatRepairText.value = summary.exportGate?.chatRepairText ?? "";
        chatMustFixIds.value = summary.exportGate?.closureSnapshot?.blockIds ?? [];
        serverFixedIds.value = [...new Set(shapeSalvageLog.value.map((e) => e.ruleId))];
        if (summary.exportGate) {
          const { blocks = 0, warns = 0 } = summary.exportGate.coverage ?? {};
          const salvageN = shapeSalvageLog.value.length;
          window.$message.info(
            `预览更新完成 · ${summary.tier ?? summary.preImport?.tier ?? "T2"} · ${summary.exportGate.exportAllowed ? "可导入" : "阻断"} · ${(summary.exportGate.closureSnapshot?.blockIds ?? []).length ? `规则 ${(summary.exportGate.closureSnapshot?.blockIds ?? []).slice(0, 8).join(",")}` : `BLOCK ${blocks} / WARN ${warns}`}${salvageN ? ` · 已自动修复 ${salvageN}` : ""}`
          );
        }
      } catch (e) {
        const err = e;
        const details = err.response?.data?.data ?? err.data;
        const crt = typeof details?.chatRepairText === "string" ? details.chatRepairText : "";
        if (crt) {
          exportAllowed.value = false;
          chatRepairText.value = crt;
          if (Array.isArray(details?.blocks)) {
            chatMustFixIds.value = details.blocks.map((b) => String(b.id ?? "")).filter(Boolean);
          }
        }
        window.$message.error(err.response?.data?.message || err.message || $t("workbench.production.importScriptBundle.failed"));
      } finally {
        previewLoading.value = false;
      }
    }
    function syncSmartProposalsFromBody(body) {
      if (Array.isArray(body?.proposals)) {
        smartDesignProposals.value = body.proposals;
        if (closurePreview.value) {
          closurePreview.value = { ...closurePreview.value, smartDesignProposals: body.proposals };
        }
      }
    }
    async function callSmartProposalOps(payload) {
      smartProposalLoading.value = true;
      try {
        const data = await instance.post("/scriptAgent/smartProposalOps", {
          projectId: props.projectId,
          scriptId: props.scriptId,
          syncStoryboard: true,
          ...payload
        });
        return data?.data ?? data;
      } finally {
        smartProposalLoading.value = false;
      }
    }
    async function onConfirmSmartProposal(payload) {
      try {
        const body = await callSmartProposalOps({ action: "confirm", ...payload });
        syncSmartProposalsFromBody(body);
        window.$message.success("已确认提案路径；可 Apply 写库");
      } catch (e) {
        window.$message.error(e?.message || "Confirm 失败");
      }
    }
    async function onRejectSmartProposal(payload) {
      try {
        const body = await callSmartProposalOps({ action: "reject", ...payload });
        syncSmartProposalsFromBody(body);
        window.$message.info("已拒绝提案");
      } catch (e) {
        window.$message.error(e?.message || "拒绝失败");
      }
    }
    async function onPresentationFork(payload) {
      await onConfirmSmartProposal(payload);
    }
    async function onApplySmartProposals() {
      try {
        const body = await callSmartProposalOps({ action: "apply" });
        syncSmartProposalsFromBody(body);
        toastAfterApplyExitGate(body, "提案已写库");
        if (lastBundle.value) await onDryRun();
      } catch (e) {
        window.$message.error(e?.message || "Apply 失败");
      }
    }
    async function onOneClickHeal() {
      if (!lastBundle.value) {
        window.$message.warning("请先预览变更");
        return;
      }
      healLoading.value = true;
      try {
        const healed = await importHeal({
          bundle: lastBundle.value,
          apply: true,
          projectId: props.projectId,
          scriptId: props.scriptId
        });
        lastBundle.value = healed.bundle;
        jsonText.value = JSON.stringify(healed.bundle, null, 2);
        closurePreview.value = healed.inspected ?? null;
        shapeSalvageLog.value = healed.shapeSalvageLog ?? [];
        serverFixedIds.value = healed.serverFixedIds ?? [];
        chatMustFixIds.value = healed.chatMustFixIds ?? [];
        exportAllowed.value = healed.exportGate?.exportAllowed ?? null;
        chatRepairText.value = healed.exportGate?.chatRepairText ?? "";
        healPrimary.value = healed.primary ?? null;
        healLog.value = healed.healLog ?? [];
        const blocks = healed.exportGate?.coverage?.blocks ?? healed.exportGate?.blocks?.length ?? 0;
        const warns = healed.exportGate?.coverage?.warns ?? healed.exportGate?.warns?.length ?? 0;
        const fixedN = (healed.serverFixedIds ?? []).length;
        const remainIds = (healed.chatMustFixIds ?? []).slice(0, 8).join(",") || `BLOCK ${blocks}`;
        const human = healed.primary?.userMessage;
        if (fixedN > 0 || healed.precheckLoop?.ok) {
          window.$message.success(
            human ? `已自动完善 ${fixedN} 项 · ${human}` : `一键完善完成 · 服务端修复 ${fixedN} 项；仍剩 ${remainIds}${warns ? ` / WARN ${warns}` : ""}${chatMustFixIds.value.length ? "（结构/叙事请贴清单）" : ""}`
          );
        } else {
          window.$message.warning(
            human || healed.precheckLoop?.repairHint?.chatTemplate || `无可自动修复；仍剩 ${remainIds}${warns ? ` / WARN ${warns}` : ""}（结构/叙事请贴清单）`
          );
        }
      } catch (e) {
        window.$message.error(e?.message || "一键完善失败");
      } finally {
        healLoading.value = false;
      }
    }
    async function onConfirm() {
      if (!jsonText.value.trim()) {
        window.$message.warning($t("workbench.production.importScriptBundle.empty"));
        return;
      }
      if (mergeStrategy.value === "replaceAll") {
        const ok = window.confirm("全量替换将删除本集已生成分镜图与镜级资产绑定，确认继续？");
        if (!ok) return;
      }
      loading.value = true;
      try {
        const bundle = lastBundle.value ?? parseBundle(jsonText.value);
        const result = await importScriptBundle({
          projectId: props.projectId,
          bundle,
          targetScriptId: props.scriptId,
          autoDesign: autoDesign.value,
          mergeStrategy: mergeStrategy.value,
          importMode: props.scriptId ? "update" : "upsert",
          blockOnQualityGate: true
        });
        const store = useProductionAgentStore();
        store.episodesId = result.scriptId;
        await store.getFlowData();
        const preserved = result.mergeReport?.mediaPreservedCount ?? 0;
        const assetDiagnostics = result.mergeReport?.assetDiagnostics;
        const weakN = assetDiagnostics?.weakPromptCount ?? 0;
        const speakerN = assetDiagnostics?.speakerSeeded ?? 0;
        const weakHint = weakN || speakerN ? `；弱设定 ${weakN} / stub种子 ${speakerN}（默认跳过批量生图）` : "";
        window.$message.success(
          preserved > 0 ? `${$t("workbench.production.importScriptBundle.success")}（保留 ${preserved} 张分镜图；资产 +${assetDiagnostics?.linked ?? 0} / 清理 ${assetDiagnostics?.pruned ?? 0}${weakHint}）` : `${$t("workbench.production.importScriptBundle.success")}（资产 +${assetDiagnostics?.linked ?? 0} / 清理 ${assetDiagnostics?.pruned ?? 0}${weakHint}）`
        );
        visible.value = false;
        resetState();
        emit("imported", result.scriptId);
      } catch (e) {
        let message = e?.message || $t("workbench.production.importScriptBundle.failed");
        try {
          const parsed = JSON.parse(message);
          const crt = parsed.chatRepairText ?? parsed.data?.chatRepairText;
          if (crt) {
            exportAllowed.value = false;
            chatRepairText.value = crt;
            void navigator.clipboard?.writeText(crt);
            window.$message.warning("导入被闸门阻断：已复制闭环修复清单到剪贴板");
            return;
          }
          if (parsed.code === "ASSET_CLOSURE_BLOCK" || parsed.data?.code === "ASSET_CLOSURE_BLOCK") {
            message = `资产闭环失败：${(parsed.details ?? []).map((d) => `${d.code} ${d.hint ?? ""}`.trim()).join("；")}`;
          }
        } catch {
        }
        const err = e;
        const crt2 = err.response?.data?.data?.chatRepairText;
        if (crt2) {
          exportAllowed.value = false;
          chatRepairText.value = crt2;
          void navigator.clipboard?.writeText(crt2);
          window.$message.warning("导入被闸门阻断：已复制闭环修复清单到剪贴板");
          return;
        }
        window.$message.error(err.response?.data?.message || message);
      } finally {
        loading.value = false;
      }
    }
    return (_ctx, _cache) => {
      const _component_t_textarea = Textarea;
      const _component_t_button = Button;
      const _component_t_upload = Upload;
      const _component_t_checkbox = Checkbox;
      const _component_t_radio_button = RadioButton;
      const _component_t_radio_group = RadioGroup;
      const _component_t_alert = Alert;
      const _component_t_dialog = Dialog;
      return openBlock(), createBlock(_component_t_dialog, {
        visible: visible.value,
        "onUpdate:visible": _cache[4] || (_cache[4] = ($event) => visible.value = $event),
        header: _ctx.$t("workbench.production.importScriptBundle.title"),
        width: 760,
        "confirm-btn": _ctx.$t("workbench.production.importScriptBundle.confirm"),
        "cancel-btn": _ctx.$t("workbench.production.cancel"),
        "confirm-loading": loading.value,
        "close-on-overlay-click": true,
        "close-on-esc-keydown": true,
        "destroy-on-close": "",
        onConfirm,
        onCancel,
        onClose
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("p", _hoisted_2, toDisplayString(_ctx.$t("workbench.production.importScriptBundle.hint")), 1),
            createVNode(_component_t_textarea, {
              modelValue: jsonText.value,
              "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => jsonText.value = $event),
              placeholder: _ctx.$t("workbench.production.importScriptBundle.placeholder"),
              autosize: { minRows: 12, maxRows: 20 }
            }, null, 8, ["modelValue", "placeholder"]),
            createBaseVNode("div", _hoisted_3, [
              createVNode(_component_t_upload, {
                "auto-upload": false,
                accept: ".json,application/json",
                "show-upload-list": false,
                onChange: onFileChange
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_button, {
                    size: "small",
                    variant: "outline"
                  }, {
                    default: withCtx(() => [
                      createTextVNode(toDisplayString(_ctx.$t("workbench.production.importScriptBundle.upload")), 1)
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              }),
              createVNode(_component_t_checkbox, {
                modelValue: autoDesign.value,
                "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => autoDesign.value = $event)
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.$t("workbench.production.importScriptBundle.autoDesign")), 1)
                ]),
                _: 1
              }, 8, ["modelValue"]),
              createVNode(_component_t_radio_group, {
                modelValue: mergeStrategy.value,
                "onUpdate:modelValue": _cache[2] || (_cache[2] = ($event) => mergeStrategy.value = $event),
                variant: "default-filled",
                size: "small"
              }, {
                default: withCtx(() => [
                  createVNode(_component_t_radio_button, { value: "preserveMedia" }, {
                    default: withCtx(() => [..._cache[5] || (_cache[5] = [
                      createTextVNode("保留已生成图", -1)
                    ])]),
                    _: 1
                  }),
                  createVNode(_component_t_radio_button, { value: "mergeLayers" }, {
                    default: withCtx(() => [..._cache[6] || (_cache[6] = [
                      createTextVNode("分层合并", -1)
                    ])]),
                    _: 1
                  }),
                  createVNode(_component_t_radio_button, { value: "replaceAll" }, {
                    default: withCtx(() => [..._cache[7] || (_cache[7] = [
                      createTextVNode("全量替换", -1)
                    ])]),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["modelValue"]),
              createVNode(_component_t_button, {
                size: "small",
                variant: "text",
                loading: previewLoading.value,
                onClick: onDryRun
              }, {
                default: withCtx(() => [..._cache[8] || (_cache[8] = [
                  createTextVNode(" 预览更新 ", -1)
                ])]),
                _: 1
              }, 8, ["loading"]),
              closurePreview.value ? (openBlock(), createBlock(_component_t_button, {
                key: 0,
                size: "small",
                theme: "primary",
                variant: "outline",
                loading: healLoading.value,
                title: "仅声明型：空镜 F0 / 孤儿场降 F0 / 口型抬时长 / 投影已有 visualEffect；不编造特效、不改情节、不拆 sceneName",
                onClick: onOneClickHeal
              }, {
                default: withCtx(() => [..._cache[9] || (_cache[9] = [
                  createTextVNode(" 一键完善（仅声明型） ", -1)
                ])]),
                _: 1
              }, 8, ["loading"])) : createCommentVNode("", true)
            ]),
            _cache[11] || (_cache[11] = createBaseVNode("p", { class: "hint subtle" }, " 一键完善只做声明型：F0 / 孤儿降级 / 口型；结构与叙事须贴「复制闭环修复清单」。启发式自动设计不产生 FX/NAR 完整字段；有 preDesignPack.shots 时会跳过。全量替换会删除本集已生成分镜图。 ", -1)),
            previewSummary.value ? (openBlock(), createBlock(_component_t_alert, {
              key: 0,
              theme: exportAllowed.value ? "success" : "warning",
              close: false,
              class: "preview"
            }, {
              message: withCtx(() => [
                createBaseVNode("div", _hoisted_4, [
                  createBaseVNode("div", null, [
                    exportAllowed.value != null ? (openBlock(), createElementBlock("div", _hoisted_5, toDisplayString(exportAllowed.value ? "可导入" : "阻断 — 请先完善"), 1)) : createCommentVNode("", true),
                    blockIdsBanner.value ? (openBlock(), createElementBlock("div", _hoisted_6, toDisplayString(blockIdsBanner.value), 1)) : createCommentVNode("", true),
                    primaryBlockHint.value ? (openBlock(), createElementBlock("div", _hoisted_7, toDisplayString(primaryBlockHint.value), 1)) : createCommentVNode("", true),
                    salvageBanner.value ? (openBlock(), createElementBlock("div", _hoisted_8, toDisplayString(salvageBanner.value), 1)) : createCommentVNode("", true),
                    previewSummary.value.willCreateScript ? (openBlock(), createElementBlock("div", _hoisted_9, toDisplayString(_ctx.$t("workbench.production.importScriptBundle.willCreate")), 1)) : createCommentVNode("", true),
                    previewSummary.value.willOverwriteLayers?.length ? (openBlock(), createElementBlock("div", _hoisted_10, toDisplayString(_ctx.$t("workbench.production.importScriptBundle.willOverwrite")) + ": " + toDisplayString(previewSummary.value.willOverwriteLayers.join(", ")), 1)) : createCommentVNode("", true),
                    createBaseVNode("div", null, toDisplayString(_ctx.$t("workbench.production.importScriptBundle.storyboardCount")) + ": " + toDisplayString(previewSummary.value.storyboardCount), 1),
                    createBaseVNode("div", null, "合并策略: " + toDisplayString(previewSummary.value.mergeStrategy || mergeStrategy.value), 1)
                  ]),
                  exportAllowed.value === false && chatRepairText.value ? (openBlock(), createBlock(_component_t_button, {
                    key: 0,
                    size: "small",
                    theme: "danger",
                    variant: "outline",
                    onClick: _cache[3] || (_cache[3] = ($event) => onCopyAllChat(chatRepairText.value))
                  }, {
                    default: withCtx(() => [..._cache[10] || (_cache[10] = [
                      createTextVNode(" 复制闭环修复清单 ", -1)
                    ])]),
                    _: 1
                  })) : createCommentVNode("", true)
                ])
              ]),
              _: 1
            }, 8, ["theme"])) : createCommentVNode("", true),
            closurePreview.value ? (openBlock(), createBlock(ClosureRulePanel, {
              key: 1,
              result: closurePreview.value,
              "shape-salvage-log": shapeSalvageLog.value,
              "server-fixed-ids": serverFixedIds.value,
              "chat-must-fix-ids": chatMustFixIds.value,
              "export-allowed": exportAllowed.value ?? void 0,
              "chat-repair-text": chatRepairText.value,
              "user-message": healPrimary.value?.userMessage,
              "cta-label": healPrimary.value?.ctaLabel,
              "primary-next-step": healPrimary.value?.primaryNextStep,
              "heal-log": healLog.value,
              "smart-design-proposals": smartDesignProposals.value,
              class: "closurePreview",
              onRePush,
              onCopyChat,
              onCopyAllChat,
              onConfirmSmartProposal,
              onRejectSmartProposal,
              onApplySmartProposals,
              onPresentationFork
            }, null, 8, ["result", "shape-salvage-log", "server-fixed-ids", "chat-must-fix-ids", "export-allowed", "chat-repair-text", "user-message", "cta-label", "primary-next-step", "heal-log", "smart-design-proposals"])) : createCommentVNode("", true)
          ])
        ]),
        _: 1
      }, 8, ["visible", "header", "confirm-btn", "cancel-btn", "confirm-loading"]);
    };
  }
});

/* unplugin-vue-components disabled */

const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-d7c45eea"]]);

export { index as default };
