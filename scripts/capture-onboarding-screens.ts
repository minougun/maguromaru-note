/**
 * 本番と同じ Next アプリを、固定ビューポートで切り取って PNG 保存する。
 *
 * ## 使い方
 *
 * 1. 初回のみ Chromium を入れる: npx playwright install chromium
 * 2. npm run capture:onboarding
 *    - 既に dev が動いていればそこへ接続。どこにも繋がらなければ **このリポジトリで next dev を自動起動**（終了時に停止）
 * 3. チュートリアル用モックの PNG（OnboardingDeviceMock のみ）: npm run capture:tutorial-mock
 *    - 出力既定: public/onboarding/tutorial/*.png（CAPTURE_TUTORIAL_OUTPUT_DIR で変更可）
 * 4. 自動起動を止めたいとき: CAPTURE_AUTO_START_DEV=0（別ターミナルで npm run dev 必須）
 *
 * ### WSL の注意
 *
 * - **dev もキャプチャも WSL 内**なら既定の http://127.0.0.1:3000 でよいことが多い。
 * - **dev が Windows 側**でキャプチャだけ WSL から叩く場合、127.0.0.1 では届かないことがある。
 *   その場合は **自動で** ip route の default via、続けてプライベート帯の nameserver を試す（100.64–100.127 の DNS は VPN 用として除外）。
 * - nameserver が 100.x だけ等で自動候補が空のとき: CAPTURE_WINDOWS_HOST_CANDIDATES=（Windows で ipconfig した IPv4）
 * - 先に Windows 向け固定: CAPTURE_USE_WSL_WINDOWS_HOST=1
 * - 自動再試行オフ: CAPTURE_NO_WSL_AUTO_FALLBACK=1
 *
 * ## 環境変数
 *
 * | 変数 | 既定 | 説明 |
 * |------|------|------|
 * | CAPTURE_BASE_URL | http://127.0.0.1:3000 | オリジン |
 * | CAPTURE_USE_WSL_WINDOWS_HOST | （未設定） | 1 なら最初から nameserver IP を使う |
 * | CAPTURE_NO_WSL_AUTO_FALLBACK | （未設定） | 1 なら 127.0.0.1 失敗時の自動 Windows ホスト再試行をしない |
 * | CAPTURE_WINDOWS_HOST_CANDIDATES | （未設定） | カンマ区切り IPv4。自動試行の先頭に追加（例 Windows の ipconfig IPv4） |
 * | CAPTURE_KEEP_LOCALHOST | （未設定） | 1 なら hostname を localhost のままにする |
 * | NEXT_PUBLIC_BASE_PATH | （未設定） | next.config の basePath と揃える |
 * | CAPTURE_OUTPUT_DIR | public/onboarding/capture | 出力ディレクトリ |
 * | CAPTURE_VIEWPORT_WIDTH | 430 | 幅 |
 * | CAPTURE_VIEWPORT_HEIGHT | 932 | 高さ |
 * | CAPTURE_DEVICE_SCALE_FACTOR | 1 | 2 で高解像度 |
 * | CAPTURE_PROBE_TIMEOUT_MS | 5000 | 接続確認のタイムアウト |
 * | CAPTURE_AUTO_START_DEV | （既定: 有効） | 0 で既存サーバー必須（自動 next dev オフ） |
 * | CAPTURE_AUTO_DEV_PORT | （未設定） | 指定時はそのポートで自動起動。未指定は空きポート |
 * | CAPTURE_AUTO_DEV_WAIT_MS | 180000 | 自動起動 dev の待ち上限 |
 * | CAPTURE_MOCK_TUTORIAL | （未設定） | 1 で `/dev/onboarding-mock-capture` からモック要素のみスクショ |
 * | CAPTURE_TUTORIAL_OUTPUT_DIR | public/onboarding/tutorial | モック PNG の出力先 |
 *
 * 本番ビルドでモック URL を開くとき: `MAGUROMARU_TUTORIAL_SCREENSHOT_SERVER=1 npx next start -p <port>`（`npm run start:tutorial-capture`）
 *
 * 出力（実画面）: home.png record.png zukan.png quiz.png titles.png account.png
 * 出力（モック）: intro.png home.png … account.png
 *
 * 参照: ローカル /mnt/c/Users/minou/maguromaru-note/scripts/capture-onboarding-screens.ts
 */

import { execSync, spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import { createServer } from "node:net";
import path from "node:path";

import { chromium, type Page } from "playwright";

const ONBOARDING_DONE_KEY = "maguro_note_onboarding_v8_done";
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

function mockTutorialCaptureUrl(origin: string, screen: string): string {
  const u = new URL(appUrl(origin, "/dev/onboarding-mock-capture"));
  u.searchParams.set("screen", screen);
  return u.toString();
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

/** 100.64.0.0/10（Tailscale の DNS 等）。Windows ホストではないことが多い */
function isCgnat100Block(ip: string): boolean {
  const p = ip.split(".").map((x) => Number.parseInt(x, 10));
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return false;
  }
  if (p[0] !== 100) {
    return false;
  }
  return p[1] >= 64 && p[1] <= 127;
}

function isPrivateLanIpv4(ip: string): boolean {
  const p = ip.split(".").map((x) => Number.parseInt(x, 10));
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return false;
  }
  if (p[0] === 10) {
    return true;
  }
  if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) {
    return true;
  }
  if (p[0] === 192 && p[1] === 168) {
    return true;
  }
  return false;
}

/** WSL2 では default via が Windows ホストであることが多い（resolv の先頭 nameserver は VPN 100.x になり得る） */
function parseDefaultGatewayFromIpRoute(): string | null {
  try {
    const out = execSync("ip route show default", {
      encoding: "utf8",
      maxBuffer: 32 * 1024,
    });
    const m = /^default\s+via\s+(\d{1,3}(?:\.\d{1,3}){3})\b/m.exec(out);
    const ip = m?.[1];
    if (!ip || ip.startsWith("127.")) {
      return null;
    }
    return ip;
  } catch {
    return null;
  }
}

function parseFilteredResolvNameservers(): string[] {
  const ips: string[] = [];
  try {
    const text = readFileSync("/etc/resolv.conf", "utf8");
    for (const line of text.split("\n")) {
      const m = /^nameserver\s+(\d{1,3}(?:\.\d{1,3}){3})\s*$/.exec(line.trim());
      const ip = m?.[1];
      if (!ip || ip.startsWith("127.")) {
        continue;
      }
      if (isCgnat100Block(ip)) {
        continue;
      }
      if (!isPrivateLanIpv4(ip)) {
        continue;
      }
      ips.push(ip);
    }
  } catch {
    /* */
  }
  return ips;
}

function extraCandidatesFromEnv(): string[] {
  const raw = process.env.CAPTURE_WINDOWS_HOST_CANDIDATES?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^\d{1,3}(?:\.\d{1,3}){3}$/.test(s));
}

/** Windows ホストへ向けうる IPv4 を優先順で列挙（重複なし） */
function listWslWindowsHostCandidates(): string[] {
  const out: string[] = [];
  for (const ip of extraCandidatesFromEnv()) {
    if (!out.includes(ip)) {
      out.push(ip);
    }
  }
  const gw = parseDefaultGatewayFromIpRoute();
  if (gw && !out.includes(gw)) {
    out.push(gw);
  }
  for (const ip of parseFilteredResolvNameservers()) {
    if (!out.includes(ip)) {
      out.push(ip);
    }
  }
  return out;
}

function primaryWslWindowsHostIp(): string | null {
  const list = listWslWindowsHostCandidates();
  return list[0] ?? null;
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
  const ip = primaryWslWindowsHostIp();
  if (!ip) {
    console.info(
      "[capture] CAPTURE_USE_WSL_WINDOWS_HOST=1 ですが Windows ホスト候補が得られませんでした。CAPTURE_WINDOWS_HOST_CANDIDATES または CAPTURE_BASE_URL を指定してください",
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

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.once("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      s.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        if (addr && typeof addr === "object" && typeof addr.port === "number") {
          resolve(addr.port);
        } else {
          reject(new Error("空きポートを取得できませんでした"));
        }
      });
    });
  });
}

/** Unix では detached + プロセスグループへ SIG* を送り、npx 子の next まで止める */
function killDevTree(child: ChildProcess, signal: NodeJS.Signals): void {
  const pid = child.pid;
  if (pid == null || pid <= 0) {
    return;
  }
  if (process.platform === "win32") {
    try {
      child.kill(signal);
    } catch {
      /* */
    }
    return;
  }
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      /* */
    }
  }
}

async function stopDevChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  console.info("[capture] 自動起動した next dev を終了します…");
  await new Promise<void>((resolve) => {
    const killTimer = setTimeout(() => {
      killDevTree(child, "SIGKILL");
      resolve();
    }, 10_000);
    child.once("exit", () => {
      clearTimeout(killTimer);
      resolve();
    });
    try {
      killDevTree(child, "SIGTERM");
    } catch {
      clearTimeout(killTimer);
      resolve();
    }
  });
}

/** 既存サーバーが無いとき、この cwd で next dev を立ち上げる（127.0.0.1 のみ bind） */
async function startEmbeddedNextDev(cwd: string): Promise<{ child: ChildProcess; origin: string }> {
  const port = process.env.CAPTURE_AUTO_DEV_PORT?.trim()
    ? envInt("CAPTURE_AUTO_DEV_PORT", 3099)
    : await findFreePort();

  console.info("[capture] npx next dev を起動します（ポート " + port + ", 127.0.0.1）…");

  const child = spawn("npx", ["next", "dev", "-p", String(port), "-H", "127.0.0.1"], {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    detached: process.platform !== "win32",
  });

  let stderrTail = "";
  child.stderr?.on("data", (buf: Buffer) => {
    stderrTail = (stderrTail + buf.toString()).slice(-6000);
  });
  child.stdout?.on("data", (buf: Buffer) => {
    stderrTail = (stderrTail + buf.toString()).slice(-6000);
  });

  const origin = "http://127.0.0.1:" + port;
  const probeUrl = appUrl(origin, "/");

  await sleep(800);

  const maxWait = envInt("CAPTURE_AUTO_DEV_WAIT_MS", 180_000);
  const deadline = Date.now() + maxWait;
  const poll = 1500;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        "next dev が起動直後に終了しました（exit " +
          String(child.exitCode) +
          "）。ログ抜粋:\n" +
          stderrTail.slice(-2000),
      );
    }
    try {
      await httpProbe(probeUrl, 5000);
      console.info("[capture] 自動起動 dev が応答しました → " + origin);
      return { child, origin };
    } catch {
      await sleep(poll);
    }
  }

  killDevTree(child, "SIGTERM");
  await sleep(1500);
  killDevTree(child, "SIGKILL");
  throw new Error(
    "next dev の起動待ちが " +
      maxWait +
      "ms でタイムアウトしました。ログ抜粋:\n" +
      stderrTail.slice(-2000),
  );
}

function buildConnectError(triedProbeUrls: string[]): Error {
  const list = triedProbeUrls.map((u) => "  - " + u).join("\n");
  return new Error(
    "いずれの URL にも接続できませんでした。\n試した URL:\n" +
      list +
      "\n\n対処:\n" +
      "- ポートが 3002 等なら CAPTURE_BASE_URL=http://127.0.0.1:3002（または届く IP と同じポート）\n" +
      "- **Windows で next dev / WSL でキャプチャ**のとき: dev が止まっている・別ポート・ファイアウォールで弾かれていると 172.x から届きません。Windows のターミナルで listen を確認。**明示的に全体公開するなら npm run dev:host**（-H 0.0.0.0）\n" +
      "- Windows ファイアウォールで Node のポートを許可する\n" +
      "- 手動 IP: CAPTURE_WINDOWS_HOST_CANDIDATES=（Windows の ipconfig の IPv4）\n" +
      "- 自動候補を切る: CAPTURE_NO_WSL_AUTO_FALLBACK=1",
  );
}

/** 接続できるオリジンを確定（WSL では 127.0.0.1 失敗後に Windows ホスト候補を順に試行） */
async function resolveReachableOrigin(origin: string): Promise<string> {
  const timeoutMs = envInt("CAPTURE_PROBE_TIMEOUT_MS", 5000);
  const triedProbeUrls: string[] = [];

  const tryProbe = async (o: string): Promise<boolean> => {
    const p = appUrl(o, "/");
    triedProbeUrls.push(p);
    console.info("[capture] 接続確認: " + p + " （タイムアウト " + timeoutMs + "ms）");
    try {
      await httpProbe(p, timeoutMs);
      return true;
    } catch {
      return false;
    }
  };

  if (await tryProbe(origin)) {
    console.info("[capture] 接続 OK");
    return origin;
  }

  if (!canWslAutoFallbackToWindowsHost(origin)) {
    throw buildConnectError(triedProbeUrls);
  }

  const candidates = listWslWindowsHostCandidates();
  if (candidates.length === 0) {
    console.info(
      "[capture] Windows ホスト候補がありません（ip route default またはプライベート nameserver）。CAPTURE_WINDOWS_HOST_CANDIDATES に ipconfig の IPv4 を入れてください。",
    );
    throw buildConnectError(triedProbeUrls);
  }

  console.info("[capture] 127.0.0.1 に届かないため、候補を順に試します: " + candidates.join(", "));

  for (const ip of candidates) {
    const next = rewriteOriginHostname(origin, ip);
    if (originHostname(next) === originHostname(origin)) {
      continue;
    }
    if (await tryProbe(next)) {
      console.info("[capture] 接続 OK → " + next);
      return next;
    }
  }

  throw buildConnectError(triedProbeUrls);
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

/** OnboardingTutorial の STEPS と同じ順・同じ mockId */
const MOCK_TUTORIAL_STEPS: { file: string; screen: string }[] = [
  { file: "home.png", screen: "home" },
  { file: "record.png", screen: "record" },
  { file: "zukan.png", screen: "zukan" },
  { file: "quiz.png", screen: "quiz" },
  { file: "titles.png", screen: "titles" },
  { file: "account.png", screen: "account" },
];

async function captureMockTutorialScreens(page: Page, origin: string, outDir: string): Promise<void> {
  const art = page.locator(".onboarding-art--mock").first();

  for (const { file, screen } of MOCK_TUTORIAL_STEPS) {
    const target = mockTutorialCaptureUrl(origin, screen);
    await gotoSettle(page, target, "mock " + screen);
    await art.waitFor({ state: "visible", timeout: 45_000 });
    await page.locator(".onboarding-mock-brand-img").first().waitFor({ state: "visible", timeout: 15_000 });
    await page.evaluate(() => document.fonts.ready);
    await sleep(500);

    const outPath = path.join(outDir, file);
    await art.screenshot({
      path: outPath,
      animations: "disabled",
    });
    console.info("[capture] wrote " + outPath);
  }
}

async function main() {
  const mockTutorial = process.env.CAPTURE_MOCK_TUTORIAL === "1" || process.argv.includes("--tutorial-mock");
  const rawOrigin = (process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
  let origin = normalizeCaptureOrigin(rawOrigin);
  origin = maybeUseWslWindowsHost(origin);
  const outRel = mockTutorial
    ? process.env.CAPTURE_TUTORIAL_OUTPUT_DIR?.trim() || "public/onboarding/tutorial"
    : process.env.CAPTURE_OUTPUT_DIR?.trim() || "public/onboarding/capture";
  const outDir = path.isAbsolute(outRel) ? outRel : path.join(process.cwd(), outRel);

  const width = envInt("CAPTURE_VIEWPORT_WIDTH", 430);
  const height = envInt("CAPTURE_VIEWPORT_HEIGHT", 932);
  const deviceScaleFactor = envFloat("CAPTURE_DEVICE_SCALE_FACTOR", 1);

  console.info("[capture] mode: " + (mockTutorial ? "tutorial mock（OnboardingDeviceMock）" : "実画面ルート"));
  console.info("[capture] viewport: " + width + "x" + height + " dpr=" + deviceScaleFactor);
  console.info("[capture] output: " + outDir);

  await mkdir(outDir, { recursive: true });

  let embeddedDev: ChildProcess | null = null;
  try {
    try {
      origin = await resolveReachableOrigin(origin);
    } catch (err) {
      if (process.env.CAPTURE_AUTO_START_DEV === "0") {
        throw err;
      }
      console.info("[capture] 既存 URL に繋がらないため、このリポジトリで next dev を自動起動します（CAPTURE_AUTO_START_DEV=0 で無効）");
      const started = await startEmbeddedNextDev(process.cwd());
      embeddedDev = started.child;
      origin = started.origin;
    }
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
      if (mockTutorial) {
        await captureMockTutorialScreens(page, origin, outDir);
      } else {
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
      }
    } finally {
      await browser.close();
    }
  } finally {
    if (embeddedDev) {
      await stopDevChild(embeddedDev);
    }
  }
}

void main().catch((err) => {
  console.error("[capture] failed:", err);
  process.exitCode = 1;
});
