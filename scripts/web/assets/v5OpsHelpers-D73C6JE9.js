function designExitStillOpen(body) {
  if (!body) return false;
  if (body.designExitPass === false) return true;
  const gate = body.exitGate ?? body.exitReassert;
  if (gate && gate.ok === false) return true;
  return false;
}
function toastAfterApplyExitGate(body, closedLabel = "已应用并设计闭合") {
  if (!body) {
    window.$message?.success?.(closedLabel);
    return true;
  }
  if (designExitStillOpen(body)) {
    const short = body.userMessage && /已吸收|可继续生成|债已清/.test(String(body.userMessage)) ? String(body.userMessage) : "设计债未尽已记入台账（不阻断生成）";
    const msg = /exit:/i.test(short) ? "设计债未尽已记入台账（不阻断生成）" : short;
    window.$message?.info?.(msg);
    return false;
  }
  window.$message?.success?.(body.a11yAnnounce || body.userMessage || body.note || closedLabel);
  return true;
}
function toastBatchSoftDefer(summary, allOkLabel = "已开始生成") {
  if (!summary || summary.softDeferred == null) {
    window.$message?.success?.(allOkLabel);
    return;
  }
  const total = summary.total ?? 0;
  const deferred = summary.softDeferred ?? 0;
  if (deferred > 0 && deferred >= total) {
    window.$message?.warning?.(summary.note || "全部 soft_defer — 未入烧，非成功");
    return;
  }
  if (summary.honestPartial) {
    const burning = summary.burning ?? total - deferred;
    window.$message?.warning?.(
      summary.note || `部分入烧 ${burning}/${total}，${deferred} 条 soft_defer — 勿当整批成功`
    );
    return;
  }
  window.$message?.success?.(summary.note || allOkLabel);
}

export { toastBatchSoftDefer as a, designExitStillOpen as d, toastAfterApplyExitGate as t };
