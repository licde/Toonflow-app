import fs from "fs";
import path from "path";
import type { Knex } from "knex";
import { RuntimeGapCollector } from "../runtimeGapRegistry";
import { listVendorSandboxGlobals } from "@/utils/vm";
import runCode from "@/utils/vm";
import { uploadReferenceAsset, hasOssUrlConfigured } from "@/ruleEngine/ports/assetPort";
import { runGenerateFlowImageCore } from "@/routes/production/editImage/generateFlowImageCore";
import u from "@/utils";

const TINY_PNG_B64 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** F0–F4 GenE2E (stub Image runner; does not call Agnes by default). */
export async function runGenE2EMatrix(
  gaps: RuntimeGapCollector,
  opts?: { db?: Knex; projectId?: number; storyboardId?: number },
): Promise<void> {
  // F4 — VM sandbox exposes AssetPort globals
  const globals = listVendorSandboxGlobals();
  if (!globals.includes("uploadReferenceAsset") || !globals.includes("preflightPublicUrl")) {
    gaps.push("F", "GEN-REF-PORT", "listVendorSandboxGlobals 缺少 AssetPort 符号");
  }
  try {
    const probe = runCode(`
      exports.hasUpload = typeof uploadReferenceAsset === "function";
      exports.hasPreflight = typeof preflightPublicUrl === "function";
    `) as { hasUpload?: boolean; hasPreflight?: boolean };
    if (!probe.hasUpload || !probe.hasPreflight) {
      gaps.push("F", "GEN-REF-PORT", `VM 运行时未注入 AssetPort hasUpload=${probe.hasUpload} hasPreflight=${probe.hasPreflight}`);
    }
  } catch (e: any) {
    gaps.push("F", "GEN-REF-PORT", `VM probe failed: ${e?.message ?? e}`);
  }

  // F0 — ossURL precedence over localhost
  const prevOss = process.env.ossURL;
  const prevNode = process.env.NODE_ENV;
  try {
    process.env.ossURL = "https://limping-education-october.ngrok-free.dev";
    process.env.NODE_ENV = "dev";
    const url = await u.oss.getFileUrl("proj/a.jpg");
    if (!url.startsWith("https://limping-education-october.ngrok-free.dev/oss/")) {
      gaps.push("F", "GEN-OSSURL", `getFileUrl 未尊重 ossURL: ${url}`);
    }
  } finally {
    if (prevOss === undefined) delete process.env.ossURL;
    else process.env.ossURL = prevOss;
    if (prevNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNode;
  }

  // F3 — text-only (no references) with stub runner
  const calls: { prompt: string; refCount: number; remotes?: string[] }[] = [];
  const stubRunner = async (input: {
    prompt: string;
    referenceList: { type: "image"; base64: string }[];
    size: string;
    aspectRatio: string;
  }) => {
    calls.push({ prompt: input.prompt, refCount: input.referenceList.length });
    return {
      save: async (p: string) => {
        await u.oss.writeFile(p, TINY_PNG_B64);
      },
      getResultUrl: async () => "/oss/stub.jpg",
    };
  };

  try {
    const out = await runGenerateFlowImageCore(
      (opts?.db ?? u.db) as Knex,
      {
        model: "agnesai:agnes-image-2.1-flash",
        quality: "1K",
        ratio: "9:16",
        prompt: "纯文生图测试",
        projectId: opts?.projectId ?? 1,
        references: [],
      },
      { imageRunner: stubRunner, urlToBase64: async () => TINY_PNG_B64 },
    );
    if (!out.url) gaps.push("F", "GEN-DERIVE-E2E", "F3 文生图 stub 未返回 url");
    if (calls.at(-1)?.refCount !== 0) gaps.push("F", "GEN-DERIVE-E2E", "F3 不应带参考图");
  } catch (e: any) {
    gaps.push("F", "GEN-DERIVE-E2E", `F3 文生图失败: ${e?.message ?? e}`);
  }

  // F1 — derivative-style: prompt + parent references
  try {
    const out = await runGenerateFlowImageCore(
      (opts?.db ?? u.db) as Knex,
      {
        model: "agnesai:agnes-image-2.1-flash",
        quality: "1K",
        ratio: "9:16",
        prompt: "坐照，双手交叠",
        projectId: opts?.projectId ?? 1,
        references: ["http://example.invalid/parent-ref.jpg"],
        mode: "singleImage",
        requireParentRef: true,
      },
      { imageRunner: stubRunner, urlToBase64: async () => TINY_PNG_B64 },
    );
    if (!out.url) gaps.push("F", "GEN-DERIVE-E2E", "F1 衍生 stub 未返回 url");
    if ((calls.at(-1)?.refCount ?? 0) < 1) gaps.push("F", "GEN-DERIVE-E2E", "F1 references 未进入 imageRunner");
    if (out.referenceCount < 1) gaps.push("F", "GEN-DERIVE-E2E", "F1 referenceCount < 1");
  } catch (e: any) {
    gaps.push("F", "GEN-DERIVE-E2E", `F1 衍生路径失败: ${e?.message ?? e}`);
  }

  // F− — derive without parent ref must not call imageRunner
  const callsBeforeNeg = calls.length;
  try {
    await runGenerateFlowImageCore(
      (opts?.db ?? u.db) as Knex,
      {
        model: "agnesai:agnes-image-2.1-flash",
        quality: "1K",
        ratio: "9:16",
        prompt: "态变异",
        projectId: opts?.projectId ?? 1,
        references: [],
        mode: "singleImage",
        requireParentRef: true,
      },
      { imageRunner: stubRunner, urlToBase64: async () => TINY_PNG_B64 },
    );
    gaps.push("F", "GEN-PARENT-REF", "无父图衍生应失败");
  } catch (e: any) {
    if (e?.code !== "DERIVE_PARENT_REF_MISSING" && !/父图|DERIVE_PARENT/i.test(String(e?.message))) {
      gaps.push("F", "GEN-PARENT-REF", `无父图错误码不符: ${e?.code ?? e?.message}`);
    }
    if (calls.length !== callsBeforeNeg) {
      gaps.push("F", "GEN-PARENT-REF", "无父图衍生不应调用 imageRunner");
    }
  }

  // F2 — storyboard path when id provided
  if (opts?.db && opts.projectId && opts.storyboardId) {
    try {
      const out = await runGenerateFlowImageCore(
        opts.db,
        {
          model: "agnesai:agnes-image-2.1-flash",
          quality: "1K",
          ratio: "9:16",
          prompt: "清瓷跪于祠堂 --cref CHAR-QINGCI --ar 9:16",
          projectId: opts.projectId,
          storyboardId: opts.storyboardId,
          references: [],
        },
        {
          imageRunner: stubRunner,
          urlToBase64: async () => TINY_PNG_B64,
        },
      );
      if (!out.url) gaps.push("F", "GEN-SB-E2E", "F2 分镜 stub 未返回 url");
    } catch (e: any) {
      gaps.push("F", "GEN-SB-E2E", `F2 分镜路径失败: ${e?.message ?? e}`);
    }
  }

  // AssetPort upload when ossURL set (write + public URL shape); skip network preflight in CI
  if (hasOssUrlConfigured() || process.env.RUNTIME_MATRIX_LIVE_GEN === "1") {
    const prev = process.env.ossURL;
    try {
      if (!hasOssUrlConfigured()) process.env.ossURL = "https://limping-education-october.ngrok-free.dev";
      const pub = await uploadReferenceAsset(TINY_PNG_B64, "image");
      if (!/^https?:\/\//i.test(pub)) gaps.push("F", "GEN-REF-UPLOAD", `uploadReferenceAsset 未返回 http URL: ${pub}`);
      if (/localhost|127\.0\.0\.1/i.test(pub)) gaps.push("F", "GEN-REF-UPLOAD", `uploadReferenceAsset 仍为本机: ${pub}`);
    } catch (e: any) {
      gaps.push("F", "GEN-REF-UPLOAD", `AssetPort 上传失败: ${e?.message ?? e}`);
    } finally {
      if (prev === undefined) delete process.env.ossURL;
      else process.env.ossURL = prev;
    }
  }

  // fixture presence note
  const fixturePng = path.join(process.cwd(), "data/fixtures/golden/gen-ref-1x1.png");
  if (!fs.existsSync(fixturePng)) {
    // optional; TINY_PNG_B64 covers CI
  }
}
