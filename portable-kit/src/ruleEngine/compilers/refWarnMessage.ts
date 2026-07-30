/**
 * SSOT warn copy for unresolved --cref / --sref codes (backend + FE parity).
 * SCENE never uses "cref" wording — soft scene-asset miss only.
 */

export type RefWarnSource = "cref" | "sref";

export function formatUnresolvedAssetRefWarning(code: string, source: RefWarnSource = "cref"): string {
  const c = String(code ?? "").trim();
  if (!c) return "未找到参考资产";
  if (/^SCENE-/i.test(c) || source === "sref") {
    return `未绑定场景资产 ${c}`;
  }
  return `未找到角色 cref ${c}`;
}

export function formatMissingAssetRowWarning(code: string): string {
  const c = String(code ?? "").trim();
  if (/^SCENE-/i.test(c)) return `未找到场景资产 ${c}`;
  return `未找到资产 ${c}`;
}

export function formatMissingLookImageWarning(label: string, code?: string): string {
  if (code && /^SCENE-/i.test(code)) return `请先生成场景参考图：${label}`;
  return `请先生成角色参考图：${label}`;
}
