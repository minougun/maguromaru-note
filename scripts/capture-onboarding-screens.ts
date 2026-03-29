/**
 * 本番と同じ Next アプリを、固定ビューポートで切り取って PNG 保存する。
 *
 * ## 使い方
 *
 * 1. 初回のみ Chromium を入れる: npx playwright install chromium
 * 2. 別ターミナルで npm run dev
 * 3. npm run capture:onboarding
 *
 * ### WSL の注意
 *
 * - **dev もキャプチャも WSL 内**なら既定の http://127.0.0.1:3000 でよいことが多い。
 * - **dev が Windows 側**でキャプチャだけ WSL から叩く場合、127.0.0.1 では届かないことがある。
 *   その場合は **自動で** /etc/resolv.conf の nameserver（Windows ホスト IP）へ再試行する（WSL 検出時・127.0.0.1/localhost のとき）。
 * - 先に Windows 向けに固定したい: CAPTURE_USE_WSL_WINDOWS_HOST=1
 * - 自動再試行を切る: CAPTURE_NO_WSL_AUTO_FALLBACK=1
 *
 * ## 環境変数
 *
 * | 変数 | 既定 | 説明 |
 * |------|------|------|
 * | CAPTURE_BASE_URL | http://127.0.0.1:3000 | オリジン |
 * | CAPTURE_USE_WSL_WINDOWS_HOST | （未設定） | 1 なら最初から nameserver IP を使う |
 * | CAPTURE_NO_WSL_AUTO_FALLBACK | （未設定） | 1 なら 127.0.0.1 失敗時の自動 Windows ホスト再試行をしない |
 * | CAPTURE_KEEP_LOCALHOST | （未設定） | 1 なら hostname を localhost のままにする |
 * | NEXT_PUBLIC_BASE_PATH | （未設定） | next.config の basePath と揃える |
 * | CAPTURE_OUTPUT_DIR | public/onboarding/capture | 出力ディレクトリ |
 * | CAPTURE_VIEWPORT_WIDTH | 430 | 幅 |
 * | CAPTURE_VIEWPORT_HEIGHT | 932 | 高さ |
 * | CAPTURE_DEVICE_SCALE_FACTOR | 1 | 2 で高解像度 |
 * | CAPTURE_PROBE_TIMEOUT_MS | 5000 | 接続確認のタイムアウト |
 *
 * 出力: home.png record.png zukan.png quiz.png titles.png account.png
 *
 * 参照: ローカル /mnt/c/Users/minou/maguromaru-note/scripts/capture-onboarding-screens.ts
 */

import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
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

/** WSL2: Windows ホストの IP は多くの環境で resolv.conf の nameserver と一致する */
function readWslWindowsHostIp(): string | null {
  try {
    const text = readFileSync("/etc/resolv.conf", "utf8");
    for (const line of text.split("\n")) {
      const m = /^nameserver\s+(\d{1,3}(?:\.\d{1,3}){3})\s*$/.exec(line.trim());
      if (m?.[1]) {
        return m[1];
      }
    }
  } catch {
    /* 非 Linux / 権限など */
  }
  return null;
}

function rewriteOriginHostname(origin: string, hostname: string): string {
  const u = new URL(origin.includes("://") ? origin : `http://${origin}`);
  u.hostname = hostname;
  return u.toString().replace(/\/$/, "");
}

/** Windows 上の next dev に、WSL から繋ぐとき用（明示指定） */
function maybeUseWslWindowsHost(origin: string): string {
  if (process.env.CAPTURE_USE_WSL_WINDOWS_HOST !== "1") {
    return origin;
  }
  const ip = readWslWindowsHostIp();
  if (!ip) {
    console.info(
      "[capture] CAPTURE_USE_WSL_WINDOWS_HOST=1 ですが /etc/resolv.conf から nameserver を読めませんでした（手動で CAPTURE_BASE_URL を指定してください）",
    );
    return origin;
  }
  const next = rewriteOriginHostname(origin, ip);
  console.info("[capture] WSL→Windows ホスト向けオリジン: " + origin + " → " + next);
  return next;
}

function isWslEnvironment(): boolean {
  if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) {
    return true;
  }
  try {
    return /microsoft/i.test(readFileSync("/proc/version", "utf8"));
  } catch {
    return false;
  }
}

function originHostname(origin: string): string {
  try {
    return new URL(origin.includes("://") ? origin : `http://${origin}`).hostname;
  } catch {
    return "";
  }
}

/** 127.0.0.1 失敗時に Windows ホストへ自動で切り替えてよいか */
function canWslAutoFallbackToWindowsHost(origin: string): boolean {
  if (process.env.CAPTURE_NO_WSL_AUTO_FALLBACK === "1") {
    return false;
  }
  if (!isWslEnvironment()) {
    return false;
  }
  const h = originHostname(origin);
  return h === "127.0.0.1" || h === "localhost";
}

/** fetch より socket タイムアウトが効きやすい（WSL でのハング対策） */
function httpProbe(urlStr: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const lib = urlStr.startsWith("https:") ? https : http;
    const req = lib.get(urlStr, (res) => {
      res.resume();
      res.on("end", () => resolve());
      res.on("error", () => resolve());
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("接続タイムアウト (" + timeoutMs + "ms): " + urlStr));
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}

function buildConnectError(failedUrl: string): Error {
  return new Error(
    "接続できません: " +
      failedUrl +
      "\n- npm run dev を起動し、ポート（例 3002）を CAPTURE_BASE_URL に合わせる" +
      "\n- 手動: CAPTURE_BASE_URL=http://（到達できるIP）:ポート" +
      "\n- WSL で自動フォールバックを無効化: CAPTURE_NO_WSL_AUTO_FALLBACK=1",
  );
}

/** 接続できるオリジンを確定（WSL では 127.0.0.1 失敗後に Windows ホストを自動試行） */
async function resolveReachableOrigin(origin: string): Promise<string> {
  const timeoutMs = envInt("CAPTURE_PROBE_TIMEOUT_MS", 5000);

  const probeOnce = async (o: string) => {
    const p = appUrl(o, "/");
    console.info("[capture] 接続確認: " + p + " （タイムアウト " + timeoutMs + "ms）");
    await httpProbe(p, timeoutMs);
  };

  try {
    await probeOnce(origin);
    console.info("[capture] 接続 OK");
    return origin;
  } catch {
    if (!canWslAutoFallbackToWindowsHost(origin)) {
      throw buildConnectError(appUrl(origin, "/"));
    }
    const ip = readWslWindowsHostIp();
    if (!ip) {
      throw buildConnectError(appUrl(origin, "/"));
    }
    const next = rewriteOriginHostname(origin, ip);
    console.info(
      "[capture] 127.0.0.1 に届かないため、WSL の nameserver（Windows ホスト）で再試行: " + next,
    );
    try {
      await probeOnce(next);
      console.info("[capture] 接続 OK");
      return next;
    } catch {
      throw buildConnectError(appUrl(next, "/"));
    }
  }
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
      "npm run dev が起動しているか、別ポートなら CAPTURE_BASE_URL を合わせてください。WSL では接続先が自動で切り替わるはずです（ダメなら CAPTURE_BASE_URL を手動指定）。";
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
  let origin = normalizeCaptureOrigin(rawOrigin);
  origin = maybeUseWslWindowsHost(origin);
  const outRel = process.env.CAPTURE_OUTPUT_DIR?.trim() || "public/onboarding/capture";
  const outDir = path.isAbsolute(outRel) ? outRel : path.join(process.cwd(), outRel);

  const width = envInt("CAPTURE_VIEWPORT_WIDTH", 430);
  const height = envInt("CAPTURE_VIEWPORT_HEIGHT", 932);
  const deviceScaleFactor = envFloat("CAPTURE_DEVICE_SCALE_FACTOR", 1);

  console.info("[capture] viewport: " + width + "x" + height + " dpr=" + deviceScaleFactor);
  console.info("[capture] output: " + outDir);

  await mkdir(outDir, { recursive: true });
  origin = await resolveReachableOrigin(origin);
  console.info("[capture] base URL（確定）: " + origin + (basePrefix() || ""));

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
