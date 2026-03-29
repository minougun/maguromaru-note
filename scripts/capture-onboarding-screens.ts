/**
 * 本番と同じ Next アプリを、固定ビューポートで切り取って PNG 保存する。
 *
 * ## 使い方
 *
 * 1. 初回のみ Chromium を入れる: npx playwright install chromium
 * 2. 別ターミナルで npm run dev（WSL では CAPTURE_BASE_URL=http://127.0.0.1:3000 を推奨）
 * 3. npm run capture:onboarding
 *
 * ## 環境変数
 *
 * | 変数 | 既定 | 説明 |
 * |------|------|------|
 * | CAPTURE_BASE_URL | http://127.0.0.1:3000 | オリジン（WSL では localhost より 127.0.0.1 推奨） |
 * | CAPTURE_KEEP_LOCALHOST | （未設定） | 1 なら hostname を localhost のままにする |
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

/**
 * WSL 等で localhost → ::1 になり、127.0.0.1 のみ listen している dev と噛み合わず goto が永遠に終わらないのを防ぐ。
 */
function normalizeCaptureOrigin(raw: string): string {
  const trimmed = raw.replace(/\/$/, "");
  if (process.env.CAPTURE_KEEP_LOCALHOST === "1") {
    return trimmed;
  }
  try {
    const u = new URL(trimmed.includes("://") ? trimmed : `http://${trimmed}`);
    if (u.hostname === "localhost") {
      u.hostname = "127.0.0.1";
      const out = u.toString().replace(/\/$/, "");
      console.info("[capture] localhost を 127.0.0.1 に置き換えました（WSL 対策）。元に戻す: CAPTURE_KEEP_LOCALHOST=1");
      return out;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

async function preflightOrigin(origin: string): Promise<void> {
  const probe = appUrl(origin, "/");
  console.info("[capture] 接続確認: " + probe);
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(probe, { signal: ctrl.signal, redirect: "manual" });
    await res.body?.cancel?.();
  } catch {
    throw new Error(
      "接続できません: " +
        probe +
        "\n- 別ターミナルで npm run dev が listen しているか確認してください\n" +
        "- WSL では CAPTURE_BASE_URL=http://127.0.0.1:3000（ポートは環境に合わせる）を明示してください",
    );
  } finally {
    clearTimeout(id);
  }
  console.info("[capture] 接続 OK");
}

/** Next dev は HMR 等で window.load が遅延・未発火になり得るため、load は短めに試して諦める */
async function gotoSettle(page: Page, url: string, label: string): Promise<void> {
  console.info("[capture] → " + label + ": " + url);
  try {
    await page.goto(url, { waitUntil: "commit", timeout: 45_000 });
    console.info("[capture]   navigation commit OK");
    await page.waitForLoadState("domcontentloaded", { timeout: 45_000 });
    console.info("[capture]   domcontentloaded OK");
  } catch (err) {
    const hint =
      "npm run dev が起動しているか、別ポートなら CAPTURE_BASE_URL を合わせてください。WSL では 127.0.0.1 を試してください。";
    throw new Error("画面へ移動できませんでした (" + url + ")。" + hint, { cause: err });
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
    console.info("[capture] 「今すぐはじめる」をクリックします");
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
  const rawOrigin = (process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  const origin = normalizeCaptureOrigin(rawOrigin);
  const outRel = process.env.CAPTURE_OUTPUT_DIR?.trim() || "public/onboarding/capture";
  const outDir = path.isAbsolute(outRel) ? outRel : path.join(process.cwd(), outRel);

  const width = envInt("CAPTURE_VIEWPORT_WIDTH", 430);
  const height = envInt("CAPTURE_VIEWPORT_HEIGHT", 932);
  const deviceScaleFactor = envFloat("CAPTURE_DEVICE_SCALE_FACTOR", 1);

  console.info("[capture] base URL: " + origin + (basePrefix() || ""));
  console.info("[capture] viewport: " + width + "x" + height + " dpr=" + deviceScaleFactor);
  console.info("[capture] output: " + outDir);

  await mkdir(outDir, { recursive: true });
  await preflightOrigin(origin);

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
      console.info("[capture] wrote " + outPath);
    }
  } finally {
    await browser.close();
  }
}

void main().catch((err) => {
  console.error("[capture] failed:", err);
  process.exitCode = 1;
});
