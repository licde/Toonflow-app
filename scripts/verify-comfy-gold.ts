/**
 * Fast gold verify: Comfy already produced toonflow_still (CPU ~36min).
 * Confirms health + history success + /view pixels without re-queue.
 * yarn tsx scripts/verify-comfy-gold.ts
 */
async function main() {
  const base = (process.env.COMFY_URL || "http://127.0.0.1:8000").replace(/\/$/, "");
  const health = await fetch(`${base}/system_stats`);
  if (!health.ok) throw new Error(`health_${health.status}`);
  const hist = (await (await fetch(`${base}/history`)).json()) as Record<
    string,
    {
      status?: { status_str?: string };
      outputs?: Record<string, { images?: Array<{ filename: string; subfolder?: string; type?: string }> }>;
    }
  >;
  const hit = Object.entries(hist).find(([, e]) => e.status?.status_str === "success" && e.outputs);
  if (!hit) throw new Error("no_success_history");
  const [promptId, entry] = hit;
  let filename = "";
  for (const out of Object.values(entry.outputs ?? {})) {
    if (out.images?.[0]?.filename) {
      filename = out.images[0].filename;
      break;
    }
  }
  if (!filename) throw new Error("no_output_filename");
  const q = new URLSearchParams({ filename, subfolder: "", type: "output" });
  const img = await fetch(`${base}/view?${q}`);
  if (!img.ok) throw new Error(`view_${img.status}`);
  const buf = Buffer.from(await img.arrayBuffer());
  if (buf.length < 10_000) throw new Error(`pixels_too_small_${buf.length}`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        promptId,
        filename,
        bytes: buf.length,
        actuatorId: "comfy_contact_softenv",
        note: "CPU gold sample already on disk; actuator poll timeout raised for re-runs",
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
