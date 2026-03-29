/**
 * `public/onboarding/tutorial/*.png`（capture:tutorial-mock 出力）を
 * 同一ピクセル寸法の WebP にまとめる（パディングは暗色で統一）。
 *
 * 使い方: npx tsx scripts/convert-tutorial-to-webp.ts
 * 参照: ローカル /mnt/c/Users/minou/maguromaru-note/scripts/convert-tutorial-to-webp.ts
 */

import { readdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const TUTORIAL_DIR = path.join(process.cwd(), "public/onboarding/tutorial");
/** オンボーディングのモック枠に近い暗色（contain 時の余白） */
const PAD = { r: 15, g: 26, b: 46, alpha: 1 } as const;
const WEBP_QUALITY = Number.parseInt(process.env.TUTORIAL_WEBP_QUALITY ?? "78", 10);

async function main() {
  const names = (await readdir(TUTORIAL_DIR)).filter((f) => f.toLowerCase().endsWith(".png"));
  if (names.length === 0) {
    console.error("[tutorial-webp] PNG がありません: " + TUTORIAL_DIR);
    process.exitCode = 1;
    return;
  }

  const metas = await Promise.all(
    names.map(async (name) => {
      const p = path.join(TUTORIAL_DIR, name);
      const m = await sharp(p).metadata();
      const w = m.width ?? 0;
      const h = m.height ?? 0;
      return { name, path: p, w, h };
    }),
  );

  const targetW = Math.max(...metas.map((x) => x.w), 1);
  const targetH = Math.max(...metas.map((x) => x.h), 1);

  console.info(
    "[tutorial-webp] 統一キャンバス: " + targetW + "×" + targetH + "px, quality=" + WEBP_QUALITY,
  );
  console.info(
    "[tutorial-webp] OnboardingTutorial の TUTORIAL_ART_WIDTH/HEIGHT と一致しているか確認してください。",
  );

  for (const { name, path: inputPath } of metas) {
    const outPath = path.join(TUTORIAL_DIR, name.replace(/\.png$/i, ".webp"));
    await sharp(inputPath)
      .resize(targetW, targetH, {
        fit: "contain",
        position: "centre",
        background: PAD,
      })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toFile(outPath);
    console.info("[tutorial-webp] wrote " + outPath);
  }
}

void main();
