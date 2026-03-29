/**
 * 図鑑マップ用: PNG を viewBox 幅に合わせて縮小し WebP 化する。
 * 元画像を `src/assets/zukan-tuna-map.png` に置いてから:
 *   node scripts/optimize-zukan-tuna-map.mjs
 */
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const input = path.join(root, "src/assets/zukan-tuna-map.png");
const output = path.join(root, "src/assets/zukan-tuna-map.webp");

const TARGET_WIDTH = 1365;

await sharp(input)
  .resize(TARGET_WIDTH, null, { withoutEnlargement: true })
  .webp({ quality: 84, effort: 6, smartSubsample: true })
  .toFile(output);

const inBytes = statSync(input).size;
const outBytes = statSync(output).size;
console.log(`zukan map: ${inBytes} bytes (png) -> ${outBytes} bytes (webp, width<=${TARGET_WIDTH})`);
