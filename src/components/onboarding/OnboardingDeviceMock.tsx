"use client";

import { publicPath } from "@/lib/public-path";

export type OnboardingMockId = "intro" | "home" | "record" | "zukan" | "quiz" | "titles" | "account";

const MOCK_TABS = [
  { href: "/", label: "ホーム", icon: "🏠" },
  { href: "/record", label: "記録", icon: "✏️" },
  { href: "/zukan", label: "図鑑", icon: "📖" },
  { href: "/quiz", label: "クイズ", icon: "🐟" },
  { href: "/titles", label: "称号", icon: "🏅" },
  { href: "/mypage", label: "マイページ", icon: "👤" },
] as const;

function activeHrefForScreen(screen: OnboardingMockId): string | null {
  switch (screen) {
    case "intro":
      return null;
    case "home":
      return "/";
    case "record":
      return "/record";
    case "zukan":
      return "/zukan";
    case "quiz":
      return "/quiz";
    case "titles":
      return "/titles";
    case "account":
      return "/mypage";
    default:
      return null;
  }
}

function MockSectionTitle({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div className="onboarding-mock-section-title-wrap">
      <div className="onboarding-mock-section-title-bar" />
      <div>
        <p className="onboarding-mock-section-title">{title}</p>
        <p className="onboarding-mock-section-sub">{subtitle}</p>
      </div>
    </div>
  );
}

function MockNoren({ children }: { children: React.ReactNode }) {
  return (
    <div className="onboarding-mock-noren">
      <span>{children}</span>
    </div>
  );
}

function MockIntro() {
  return (
    <div className="onboarding-mock-intro">
      <p className="onboarding-mock-intro-lead">画面下のタブから主要機能へ</p>
      <div className="onboarding-mock-intro-grid">
        {MOCK_TABS.map((t) => (
          <div className="onboarding-mock-intro-cell" key={t.href}>
            <span className="onboarding-mock-intro-ico">{t.icon}</span>
            <span className="onboarding-mock-intro-lbl">{t.label}</span>
          </div>
        ))}
      </div>
      <p className="onboarding-mock-intro-note">次のスライドで、それぞれの画面イメージを紹介します。</p>
    </div>
  );
}

function MockHome() {
  return (
    <>
      <MockSectionTitle subtitle="Store status" title="営業状況" />
      <div className="onboarding-mock-card">
        <div className="onboarding-mock-weather-bar">
          <span>☀️ 18℃</span>
          <span className="onboarding-mock-muted">くもり</span>
        </div>
        <div className="onboarding-mock-status-row">
          <span className="onboarding-mock-badge-open">営業中</span>
          <span className="onboarding-mock-time">最終更新 12:30</span>
        </div>
      </div>
      <MockNoren>本日の入荷状況</MockNoren>
      <div className="onboarding-mock-card onboarding-mock-stock-card">
        <div className="onboarding-mock-stock-head">
          <span className="onboarding-mock-stock-mark">丼</span>
          <span className="onboarding-mock-stock-chip">最終更新 12:30</span>
        </div>
        <div className="onboarding-mock-stock-row">
          <span className="onboarding-mock-stock-name">特上まぐろ丼</span>
          <span className="onboarding-mock-stock-ok">◎ あり</span>
        </div>
        <div className="onboarding-mock-stock-row">
          <span className="onboarding-mock-stock-name">ねぎとろ丼</span>
          <span className="onboarding-mock-stock-warn">△ 少なめ</span>
        </div>
        <p className="onboarding-mock-footnote">※ 店舗スタッフが更新しています</p>
      </div>
      <MockSectionTitle subtitle="Recent logs" title="最近の記録" />
      <div className="onboarding-mock-card onboarding-mock-log-card">
        <div className="onboarding-mock-log-line">
          <span className="onboarding-mock-log-date">3/30</span>
          <span>特上まぐろ丼</span>
        </div>
      </div>
    </>
  );
}

function MockRecord() {
  return (
    <>
      <MockNoren>今日の丼を記録</MockNoren>
      <div className="onboarding-mock-photo-zone">
        <span>
          タップでカメラ / ギャラリー
          <br />
          <small>長辺1200pxに縮小…</small>
        </span>
      </div>
      <MockSectionTitle subtitle="Menu" title="食べたメニュー" />
      <div className="onboarding-mock-menu-row">
        <span className="onboarding-mock-menu-pill onboarding-mock-menu-pill--on">特上まぐろ丼</span>
        <span className="onboarding-mock-menu-pill">ねぎとろ丼</span>
      </div>
      <MockSectionTitle subtitle="Parts" title="入っていた部位" />
      <div className="onboarding-mock-card onboarding-mock-mini-text">
        メニューを選ぶと標準部位を自動選択。実際の具合に合わせて修正します。
      </div>
      <div className="onboarding-mock-parts-mini">
        <span className="onboarding-mock-part-chip onboarding-mock-part-chip--on">大トロ</span>
        <span className="onboarding-mock-part-chip onboarding-mock-part-chip--on">中トロ</span>
        <span className="onboarding-mock-part-chip">赤身</span>
      </div>
      <div className="onboarding-mock-memo-fake">感想を書く…</div>
      <div className="onboarding-mock-primary-fake">この内容で記録する</div>
    </>
  );
}

function MockZukan() {
  return (
    <>
      <MockNoren>まぐろ図鑑</MockNoren>
      <div className="onboarding-mock-card onboarding-mock-glow">
        <p className="onboarding-mock-progress-label">コンプリート進捗</p>
        <div className="onboarding-mock-progress-big">42%</div>
        <div className="onboarding-mock-pbar">
          <div className="onboarding-mock-pbar-fill" style={{ width: "42%" }} />
        </div>
        <p className="onboarding-mock-cap">10 / 24 部位</p>
        <div className="onboarding-mock-outline-btn">図鑑の進捗をシェア</div>
      </div>
      <MockSectionTitle subtitle="Tuna map" title="部位マップ" />
      <div className="onboarding-mock-tuna-map" aria-hidden>
        <div className="onboarding-mock-tuna-shape" />
        <div className="onboarding-mock-tuna-dots">
          <span />
          <span data-on />
          <span />
          <span data-on />
          <span />
        </div>
      </div>
      <MockSectionTitle subtitle="All parts" title="部位一覧" />
      <div className="onboarding-mock-zukan-rows">
        <div className="onboarding-mock-zukan-row">
          <span>大トロ</span>
          <span className="onboarding-mock-tag-ok">記録済</span>
        </div>
        <div className="onboarding-mock-zukan-row onboarding-mock-zukan-row--miss">
          <span>？ 脳天</span>
          <span className="onboarding-mock-tag-miss">未食</span>
        </div>
      </div>
    </>
  );
}

function MockQuiz() {
  return (
    <>
      <MockNoren>まぐろクイズ</MockNoren>
      <div className="onboarding-mock-card onboarding-mock-quiz-head">
        <p className="onboarding-mock-quiz-label">現在のステージ</p>
        <p className="onboarding-mock-quiz-stage">STAGE 1</p>
        <p className="onboarding-mock-quiz-sub">入門 ─ 基礎</p>
      </div>
      <div className="onboarding-mock-card onboarding-mock-quiz-master">
        <div className="onboarding-mock-quiz-master-h">
          <span>👑 まぐろマスターへの道</span>
          <span>12%</span>
        </div>
        <div className="onboarding-mock-pbar">
          <div className="onboarding-mock-pbar-fill onboarding-mock-pbar-fill--aka" style={{ width: "12%" }} />
        </div>
        <p className="onboarding-mock-cap">累計 24 / 200 問正解</p>
      </div>
      <p className="onboarding-mock-quiz-hint">各ステージ内で累計 10問正解すると次のステージが解放</p>
      <div className="onboarding-mock-quiz-nav">
        <span className="onboarding-mock-nav-dot">◀</span>
        <div className="onboarding-mock-quiz-stage-card">
          <span className="onboarding-mock-qsl">STAGE 1</span>
          <span className="onboarding-mock-qst">入門</span>
          <span className="onboarding-mock-qsd">4択10問 ・ 累計 3 / 10</span>
        </div>
        <span className="onboarding-mock-nav-dot">▶</span>
      </div>
    </>
  );
}

function MockTitles() {
  return (
    <>
      <MockNoren>称号</MockNoren>
      <div className="onboarding-mock-card onboarding-mock-hero">
        <div className="onboarding-mock-hero-emblem">
          <span>🐟</span>
        </div>
        <p className="onboarding-mock-hero-title">まぐろビギナー</p>
        <p className="onboarding-mock-hero-sub">来店 3回 ・ 5部位コンプ</p>
      </div>
      <div className="onboarding-mock-stats-row">
        <div className="onboarding-mock-stat">
          <span className="onboarding-mock-stat-num">3</span>
          <span className="onboarding-mock-stat-unit">回</span>
          <span className="onboarding-mock-stat-lbl">来店回数</span>
        </div>
        <div className="onboarding-mock-stat">
          <span className="onboarding-mock-stat-num">5</span>
          <span className="onboarding-mock-stat-unit">種</span>
          <span className="onboarding-mock-stat-lbl">食べた部位</span>
        </div>
        <div className="onboarding-mock-stat">
          <span className="onboarding-mock-stat-num">1</span>
          <span className="onboarding-mock-stat-unit">週</span>
          <span className="onboarding-mock-stat-lbl">連続来店</span>
        </div>
      </div>
      <MockSectionTitle subtitle="Titles" title="称号一覧" />
      <div className="onboarding-mock-card onboarding-mock-title-list">
        <div className="onboarding-mock-title-row">
          <span>🐟</span>
          <div>
            <div className="onboarding-mock-tr-name">まぐろビギナー</div>
            <div className="onboarding-mock-tr-meta">解放済み</div>
          </div>
          <span className="onboarding-mock-chip-use">使用中</span>
        </div>
        <div className="onboarding-mock-title-row onboarding-mock-title-row--locked">
          <span>🔒</span>
          <div>
            <div className="onboarding-mock-tr-name">まぐろマスター</div>
            <div className="onboarding-mock-tr-meta">要・来店とクイズ</div>
          </div>
        </div>
      </div>
    </>
  );
}

function MockAccount() {
  return (
    <>
      <MockNoren>アカウント連携</MockNoren>
      <p className="onboarding-mock-account-lead">Apple・Google・メールのいずれかで連携できます。</p>
      <div className="onboarding-mock-provider onboarding-mock-provider--apple">
        <span aria-hidden className="onboarding-mock-apple-mark">
          🍎
        </span>
        <span>Apple で連携</span>
        <span className="onboarding-mock-chev">›</span>
      </div>
      <div className="onboarding-mock-provider onboarding-mock-provider--google">
        <span className="onboarding-mock-g-mark">G</span>
        <span>Google で連携</span>
        <span className="onboarding-mock-chev">›</span>
      </div>
      <div className="onboarding-mock-provider">
        <span>✉️</span>
        <span>メールアドレスで連携</span>
        <span className="onboarding-mock-chev">›</span>
      </div>
    </>
  );
}

function MockBody({ screen }: { screen: OnboardingMockId }) {
  switch (screen) {
    case "intro":
      return <MockIntro />;
    case "home":
      return <MockHome />;
    case "record":
      return <MockRecord />;
    case "zukan":
      return <MockZukan />;
    case "quiz":
      return <MockQuiz />;
    case "titles":
      return <MockTitles />;
    case "account":
      return <MockAccount />;
    default:
      return <MockIntro />;
  }
}

export function OnboardingDeviceMock({ screen }: { screen: OnboardingMockId }) {
  const activeHref = activeHrefForScreen(screen);

  return (
    <div className="onboarding-device" aria-hidden="true">
      <div className="onboarding-device-bezel">
        <header className="onboarding-mock-header">
          <div className="onboarding-mock-header-row">
            {/* eslint-disable-next-line @next/next/no-img-element -- 縮小モック用に publicPath で静的参照 */}
            <img
              alt=""
              className="onboarding-mock-brand-img"
              height={26}
              src={publicPath("/brand/maguromaru-mark.webp")}
              width={26}
            />
            <div className="onboarding-mock-header-text">
              <p className="onboarding-mock-header-title">まぐろ丸ノート</p>
              <p className="onboarding-mock-header-sub">海鮮丼まぐろ丸 ── 本町</p>
            </div>
          </div>
          <div className="onboarding-mock-accent-line" />
        </header>

        <div className="onboarding-mock-body">
          <MockBody screen={screen} />
        </div>

        <nav className="onboarding-mock-tabbar" aria-hidden>
          {MOCK_TABS.map((tab) => (
            <div className="onboarding-mock-tab" data-active={activeHref === tab.href} key={tab.href}>
              <span className="onboarding-mock-tab-ico">{tab.icon}</span>
              <span className="onboarding-mock-tab-lbl">{tab.label}</span>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
