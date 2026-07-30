/**
 * yarn tsx scripts/test-crop-turnaround-plate.ts
 */
import sharp from "sharp";
import { cropTurnaroundSheetToIdentityPlate } from "../src/ruleEngine/compilers/cropTurnaroundToIdentityPlate";
import { shouldForbidLayoutPreserve } from "../src/ruleEngine/compilers/stillRefSlotContract";

function ok(name: string, cond: boolean, detail = "") {
  if (!cond) {
    console.error(`✗ ${name}`, detail);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log(`✓ ${name}`);
}

async function main() {
  // Synthetic 4:1 sheet 800x200
  const sheet = await sharp({
    create: { width: 800, height: 200, channels: 3, background: { r: 40, g: 40, b: 50 } },
  })
    .jpeg()
    .toBuffer();
  const b64 = sheet.toString("base64");
  const cropped = await cropTurnaroundSheetToIdentityPlate(b64);
  ok("4:1 cropped", cropped.cropped === true, cropped.reason);
  const meta = await sharp(Buffer.from(cropped.base64, "base64")).metadata();
  ok("4:1 left quarter ~200", Math.abs((meta.width ?? 0) - 200) <= 2, `w=${meta.width}`);

  // Tall portrait — no crop
  const tall = await sharp({
    create: { width: 300, height: 500, channels: 3, background: { r: 10, g: 10, b: 10 } },
  })
    .jpeg()
    .toBuffer();
  const skip = await cropTurnaroundSheetToIdentityPlate(tall.toString("base64"));
  ok("portrait not cropped", skip.cropped === false, skip.reason);

  // 2:1 hero+stack (aspect 2.0 >= 1.55)
  const hero = await sharp({
    create: { width: 600, height: 300, channels: 3, background: { r: 80, g: 60, b: 40 } },
  })
    .jpeg()
    .toBuffer();
  const half = await cropTurnaroundSheetToIdentityPlate(hero.toString("base64"));
  ok("2:1 cropped", half.cropped === true, half.reason);
  const hm = await sharp(Buffer.from(half.base64, "base64")).metadata();
  ok("2:1 ~48% width", Math.abs((hm.width ?? 0) - 288) <= 2, `w=${hm.width}`);

  // Near-square 2×2 — only with assumeSheet (FE / marked turnaround)
  const grid = await sharp({
    create: { width: 800, height: 800, channels: 3, background: { r: 20, g: 30, b: 40 } },
  })
    .jpeg()
    .toBuffer();
  const gridSkip = await cropTurnaroundSheetToIdentityPlate(grid.toString("base64"));
  ok("2x2 without assumeSheet skipped", gridSkip.cropped === false, gridSkip.reason);
  const gridCrop = await cropTurnaroundSheetToIdentityPlate(grid.toString("base64"), {
    assumeSheet: true,
  });
  ok("2x2 assumeSheet cropped", gridCrop.cropped === true && gridCrop.reason === "grid_2x2_top_left");
  const gm = await sharp(Buffer.from(gridCrop.base64, "base64")).metadata();
  ok(
    "2x2 top-left 400x400",
    (gm.width ?? 0) === 400 && (gm.height ?? 0) === 400,
    `size=${gm.width}x${gm.height}`,
  );

  ok("forbid preserve on turnaround", shouldForbidLayoutPreserve({ turnaroundCrefUsed: true }));
  ok("forbid preserve on sheetLeak", shouldForbidLayoutPreserve({ sheetLeak: true }));
  ok("no forbid by default", !shouldForbidLayoutPreserve({}));

  console.log("OK crop-turnaround-plate");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
