/**
 * 本番と同じ Next アプリを、固定ビューポートで切り取って PNG 保存する。
 *
 * ## 使い方
 *
 * 1. 初回のみ Chromium を入れる: npx playwright install chromium
 * 2. 別ターミナルで npm run dev（既定 http://localhost:3000）
 * 3. npm run capture:onboarding
 *
 * ## 環境変数
 *
 * | 変数 | 既定 | 説明 |
 * |------|------|------|
 * | CAPTURE_BASE_URL | http://localhost:3000 | オリジン（末尾スラッシュなし） |
 * | NEXT_PUBLIC_BASE_PATH | （未設定） | next.config の basePath と揃える |
 * | CAPTURE_OUTPUT_DIR | public/onboarding/capture | 出力ディレクトリ（相対または絶対） |
 * | CAPTURE_VIEWPORT_WIDTH | 430 | アプリの max-width: 430px に合わせる |
 * | CAPTURE_VIEWPORT_HEIGHT | 932 | 縦は十分に取れる長さ |
 * | CAPTURE_DEVICE_SCALE_FACTOR | 1 | 2 にすると高解像度（CSS px は同じ） |
 *
 * 出力: home.png record.png zukan.png quiz.png titles.png account.png
 *
 * 参照: ローカル /mnt/c/Users/minou/maguromaru-note/scripts/capture-onboarding-screens.ts
 */

import { mkdir } from "node:fs/promises";
import path from "node:path";

import { chromium, type Page } from "playwright";

const ONBOARDING_DONE_KEY = "maguro_note_onboarding_v3_done";
const LOCAL_SESSION_KEY = "maguro-note-local-session";

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envFloat(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : fallback;
}

function basePrefix(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
  if (!raw || raw === "/") {
    return "";
  }
  return raw.replace(/\/$/, "");
}

function appUrl(origin: string, pathname: string): string {
  const base = basePrefix();
  const p = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin.replace(/\/$/, "")}${base}${p}`;
}

/** Next dev は HMR 等で window.load が遅延・未発火になり得るため、load は短めに試して諦める */
async function gotoSettle(page: Page, url: string, label: string): Promise<void> {
  console.info(`[capture] → ${label}: ${url}`);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  } catch (err) {
    const hint =
      "npm run dev が起動しているか、別ポートなら CAPTURE_BASE_URL を合わせてください。";
    throw new Error(`画面へ移動できませんでした (${url})。${hint}`, { cause: err });
  }
  await page
    .waitForLoadState("load", { timeout: 8_000 })
    .catch(() =>
      console.info(
        "[capture] (info) window.load はタイムアウトのため続行（dev の常時接続で遅れることがあります）",
      ),
    );
}

async function ensureSignedIn(page: Page, origin: string): Promise<void> {
  const entry = appUrl(origin, "/");
  await gotoSettle(page, entry, "open /");

  await page.evaluate(
    ([doneKey]) => {
      try {
        localStorage.setItem(doneKey, "1");
      } catch {
        /* ignore */
      }
    },
    [ONBOARDING_DONE_KEY] as const,
  );

  const startBtn = page.getByRole("button", { name: "今すぐはじめる" });
  const tabBar = page.locator(".tab-bar");

  console.info("[capture] ログイン状態を確認しています…");
  try {
    await startBtn.waitFor({ state: "visible", timeout: 20_000 });
    console.info('[capture] 「今すぐはじめる」をクリックします');
    await startBtn.click();
  } catch {
    /* 既にログイン済みなど */
    console.info("[capture] スタートボタンなし（既にログイン済みの可能性）");
  }

  console.info("[capture] 下部タブバー (.tab-bar) を待っています…");
  await tabBar.waitFor({ state: "visible", timeout: 120_000 });
  console.info("[capture] タブバー表示を確認しました");

  await page.evaluate(
    ([sessionKey]) => {
      try {
        sessionStorage.setItem(sessionKey, "1");
      } catch {
        /* ignore */
      }
    },
    [LOCAL_SESSION_KEY] as const,
  );
}

async function waitForNoBlockingSpinner(page: Page): Promise<void> {
  console.info("[capture] ローディング文言が消えるまで待機…");
  const phrases = ["認証情報を確認しています", "読み込み中"] as const;
  await page.waitForFunction(
    (blocked) => {
      const t = document.body?.innerText ?? "";
      return !blocked.some((p) => t.includes(p));
    },
    phrases,
    { timeout: 120_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await sleep(400);
  console.info("[capture] 待機完了");
}

const ROUTES: { file: string; path: string }[] = [
  { file: "home.png", path: "/" },
  { file: "record.png", path: "/record" },
  { file: "zukan.png", path: "/zukan" },
  { file: "quiz.png", path: "/quiz" },
  { file: "titles.png", path: "/titles" },
  { file: "account.png", path: "/mypage" },
];

async function main() {
  const origin = (process.env.CAPTURE_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const outRel = process.env.CAPTURE_OUTPUT_DIR?.trim() || "public/onboarding/capture";
  const outDir = path.isAbsolute(outRel) ? outRel : path.join(process.cwd(), outRel);

  const width = envInt("CAPTURE_VIEWPORT_WIDTH", 430);
  const height = envInt("CAPTURE_VIEWPORT_HEIGHT", 932);
  const deviceScaleFactor = envFloat("CAPTURE_DEVICE_SCALE_FACTOR", 1);

  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  try {
    console.info(`[capture] base URL: ${origin}${basePrefix() || ""}`);
    console.info(`[capture] viewport: ${width}x${height} dpr=${deviceScaleFactor}`);
    console.info(`[capture] output: ${outDir}`);

    await ensureSignedIn(page, origin);
    await waitForNoBlockingSpinner(page);

    for (const { file, path: routePath } of ROUTES) {
      const target = appUrl(origin, routePath);
      await gotoSettle(page, target, routePath || "/");
      await waitForNoBlockingSpinner(page);

      const outPath = path.join(outDir, file);
      await page.screenshot({
        path: outPath,
        fullPage: false,
        animations: "disabled",
      });
      console.info(`[capture] wrote ${outPath}`);
    }
  } finally {
    await browser.close();
  }
}

void main().catch((err) => {
  console.error("[capture] failed:", err);
  process.exitCode = 1;
});
