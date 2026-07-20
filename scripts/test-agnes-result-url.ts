/**
 * yarn test:agnes-result-url
 * Ensure remixed_from_video_id is never treated as download URL (logic mirror).
 */
let failed = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) console.log(`✓ ${label}`);
  else {
    console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

function pickVideoUrl(data: Record<string, unknown>): string | null {
  const videoUrl =
    data?.url ||
    data?.video_url ||
    (data?.data as { url?: string } | undefined)?.url ||
    (typeof data?.output === "string" && /^https?:\/\//i.test(data.output) ? data.output : null);
  if (!videoUrl || !/^https?:\/\//i.test(String(videoUrl))) return null;
  return String(videoUrl);
}

ok(
  "reject remixed id alone",
  pickVideoUrl({ remixed_from_video_id: "abc123", status: "completed" }) === null,
);
ok(
  "accept https url",
  pickVideoUrl({ url: "https://cdn.example/v.mp4", remixed_from_video_id: "abc" }) === "https://cdn.example/v.mp4",
);

const src = require("fs").readFileSync(require("path").join(process.cwd(), "data/vendor/agnesai.ts"), "utf-8");
ok("agnes source no longer prefers remixed first", !/videoUrl\s*=\s*\n?\s*resp\.data\?\.remixed_from_video_id\s*\|\|/.test(src));
ok("agnes comments ignore remixed", /remixed_from_video_id/.test(src) && /忽略 remixed|Never treat remixed/i.test(src));

if (failed) process.exit(1);
console.log("\n=== test:agnes-result-url OK ===");
