/**
 * 供应商冒烟测试：需在 DB 中配置 HuggingFace / Agnes API Key
 * 用法: yarn test:vendors
 */
import "@/env";
import u from "@/utils";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

type CaseResult = { name: string; ok: boolean; skipped?: boolean; ms: number; error?: string };

const results: CaseResult[] = [];

async function runCase(name: string, fn: () => Promise<void>, optional = false) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`✅ ${name} (${Date.now() - t0}ms)`);
  } catch (e: any) {
    const error = e?.message || String(e);
    const billingBlock = /Model not supported by provider/i.test(error);
    if (optional && billingBlock) {
      results.push({ name, ok: true, skipped: true, ms: Date.now() - t0, error });
      console.log(`⚠️ ${name} 跳过 (${Date.now() - t0}ms): HF 账号未开通第三方 Inference Providers 额度`);
      return;
    }
    results.push({ name, ok: false, ms: Date.now() - t0, error });
    console.error(`❌ ${name}: ${error}`);
  }
}

async function testRefImageBase64() {
  const buf = await sharp({
    create: { width: 512, height: 512, channels: 3, background: { r: 80, g: 120, b: 200 } },
  })
    .jpeg({ quality: 85 })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

async function assertImageFile(relPath: string) {
  const buf = await u.oss.getFile(relPath);
  if (!buf || buf.length < 100) throw new Error("图像文件为空");
}

async function assertVideoFile(relPath: string) {
  const buf = await u.oss.getFile(relPath);
  if (!buf || buf.length < 200) throw new Error("视频文件为空");
}

async function main() {
  console.log("=== Toonflow Vendor Smoke Tests ===\n");

  await runCase("HuggingFace FLUX.1-schnell 文生图", async () => {
    const img = await u.Ai.Image("huggingface:black-forest-labs/FLUX.1-schnell").run({
      prompt: "a red apple on table",
      referenceList: [],
      size: "1K",
      aspectRatio: "16:9",
    });
    await img.save("vendor-test/flux1.jpg");
    await assertImageFile("vendor-test/flux1.jpg");
  }, false);

  await runCase("HuggingFace FLUX.2-dev 图生图", async () => {
    const img = await u.Ai.Image("huggingface:black-forest-labs/FLUX.2-dev").run({
      prompt: "enhance colors",
      referenceList: [{ type: "image", base64: await testRefImageBase64() }],
      size: "1K",
      aspectRatio: "16:9",
    });
    await img.save("vendor-test/flux2.jpg");
    await assertImageFile("vendor-test/flux2.jpg");
  }, true);

  await runCase("HuggingFace Wan2.2 文生视频", async () => {
    const video = await u.Ai.Video("huggingface:Wan-AI/Wan2.2-TI2V-5B").run({
      prompt: "A cat walking slowly",
      duration: 5,
      resolution: "720p",
      aspectRatio: "16:9",
      referenceList: [],
      mode: ["text"],
    });
    await video.save("vendor-test/wan.mp4");
    await assertVideoFile("vendor-test/wan.mp4");
  }, true);

  await runCase("Agnes 文生视频", async () => {
    const video = await u.Ai.Video("agnesai:agnes-video-v2.0").run({
      prompt: "ocean waves at sunset",
      duration: 5,
      resolution: "720p",
      aspectRatio: "16:9",
      referenceList: [],
      mode: ["text"],
    });
    await video.save("vendor-test/agnes-text.mp4");
    await assertVideoFile("vendor-test/agnes-text.mp4");
  });

  const hasPublic = await u.hasPublicOssConfigured();
  if (hasPublic) {
    await runCase("Agnes 单图参考视频（公网 URL）", async () => {
      const video = await u.Ai.Video("agnesai:agnes-video-v2.0").run({
        prompt: "camera slowly zooms in",
        duration: 5,
        resolution: "720p",
        aspectRatio: "16:9",
        referenceList: [{ type: "image", base64: await testRefImageBase64() }],
        mode: ["singleImage"],
      });
      await video.save("vendor-test/agnes-ref.mp4");
      await assertVideoFile("vendor-test/agnes-ref.mp4");
    });
  } else {
    console.log("⏭️  跳过 Agnes 参考图视频（未配置 ossPublicBaseUrl / 阿里云 OSS）");
  }

  const passed = results.filter((r) => r.ok && !r.skipped).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => !r.ok);
  const reportPath = path.join(u.getPath("logs"), "vendor-test-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify({ at: new Date().toISOString(), results }, null, 2));

  console.log(`\n=== 结果: ${passed} 通过, ${skipped} 跳过, ${failed.length} 失败 ===`);
  console.log(`报告: ${reportPath}`);
  if (failed.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
