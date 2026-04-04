"use client";

import { ShareBonusCallout } from "@/components/share/ShareBonusCallout";
import { SettingsGearIcon } from "@/components/ui/SettingsGearIcon";
import { TabIcon } from "@/components/ui/TabIcon";
import { APP_INFO } from "@/lib/domain/constants";
import { MAIN_NAV_TABS } from "@/lib/main-tabs";
import { publicPath } from "@/lib/public-path";

export type OnboardingMockId = "intro" | "home" | "record" | "zukan" | "quiz" | "titles" | "account";

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
      return null;
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
      <div className="onboarding-mock-intro-strip-wrap">
        <div className="onboarding-mock-intro-tabstrip" aria-hidden="true">
          {MAIN_NAV_TABS.map((tab) => (
            <span className="onboarding-mock-intro-tabstrip-cell" key={tab.href}>
              <TabIcon className="onboarding-mock-intro-tabstrip-icon" name={tab.icon} />
              <span className="onboarding-mock-intro-tabstrip-text">{tab.stripLabel}</span>
            </span>
          ))}
        </div>
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
          <span>🌥️ 12℃ 曇り</span>
          <span>
            <span className="onboarding-mock-badge-end">本日終了</span>
          </span>
        </div>
        <p className="onboarding-mock-status-note">混雑状況や売り切れ情報はここに表示されます。</p>
      </div>
      <div className="onboarding-mock-card onboarding-mock-bot-card">
        <p className="onboarding-mock-bot-label">{APP_INFO.botName} 今日の豆知識</p>
        <p className="onboarding-mock-bot-body">本マグロの赤身は、脂だけではなく鉄っぽい香りと旨みの重なりでも評価されます。</p>
        <p className="onboarding-mock-bot-meta">日替わり豆知識 · 2026-04-03</p>
      </div>
      <MockSectionTitle subtitle="Easy goals" title="ゆるく進める目標" />
      <div className="onboarding-mock-card onboarding-mock-goals-card">
        <div className="onboarding-mock-goals-head">
          <span>ミッション</span>
          <span>2 / 4 達成</span>
        </div>
        {[
          ["はじめての記録を残す", "達成済み", "達成"],
          ["部位を3つ集める", "3 / 3", "達成"],
          ["クイズで10問正解する", "0 / 10", "進行中"],
          ["シェアボーナスを受け取る", "あと1回", "進行中"],
        ].map(([title, meta, status]) => (
          <div className="onboarding-mock-goal-row" key={title}>
            <div>
              <p className="onboarding-mock-goal-title">{title}</p>
              <p className="onboarding-mock-goal-meta">{meta}</p>
            </div>
            <span
              className={`onboarding-mock-goal-badge${
                status === "達成" ? " onboarding-mock-goal-badge--done" : " onboarding-mock-goal-badge--progress"
              }`}
            >
              {status}
            </span>
          </div>
        ))}
      </div>
      <MockNoren>{APP_INFO.inventoryTitle}</MockNoren>
      <div className="onboarding-mock-card onboarding-mock-stock-card">
        <div className="onboarding-mock-stock-head">
          <span className="onboarding-mock-stock-mark">{APP_INFO.inventoryMark}</span>
          <span className="onboarding-mock-stock-chip">最終更新時間 12:30</span>
        </div>
        <div className="onboarding-mock-stock-row">
          <div className="onboarding-mock-stock-name-block">
            <span className="onboarding-mock-stock-name">鉄火丼</span>
            <span className="onboarding-mock-stock-price">¥750</span>
          </div>
          <span className="onboarding-mock-stock-ok">◎ あり</span>
        </div>
        <div className="onboarding-mock-stock-row">
          <div className="onboarding-mock-stock-name-block">
            <span className="onboarding-mock-stock-name">中とろブツ盛り丼</span>
            <span className="onboarding-mock-stock-price">¥900</span>
          </div>
          <span className="onboarding-mock-stock-ok">◎ あり</span>
        </div>
        <div className="onboarding-mock-stock-row">
          <div className="onboarding-mock-stock-name-block">
            <span className="onboarding-mock-stock-name">特上まぐろ丼</span>
            <span className="onboarding-mock-stock-price">¥1,600</span>
          </div>
          <span className="onboarding-mock-stock-warn">△ 残りわずか</span>
        </div>
        <div className="onboarding-mock-stock-row">
          <div className="onboarding-mock-stock-name-block">
            <span className="onboarding-mock-stock-name">鉄人巻き</span>
            <span className="onboarding-mock-stock-price">¥1,400</span>
          </div>
          <span className="onboarding-mock-stock-out">✕ 終了</span>
        </div>
        <p className="onboarding-mock-footnote">※ 店舗スタッフが更新しています</p>
      </div>
    </>
  );
}

function MockRecord() {
  return (
    <>
      <MockNoren>{APP_INFO.recordTitle}</MockNoren>
      <div className="onboarding-mock-share-bonus-wrap">
        <ShareBonusCallout compact variant="visit" />
      </div>
      <div className="onboarding-mock-photo-zone">
        <span>
          タップでカメラ / ギャラリー
          <br />
          <small>長辺1200px、JPEG品質80%に縮小して送信</small>
        </span>
      </div>
      <MockSectionTitle subtitle="Menu" title="食べたメニュー" />
      <div className="menu-choice-grid onboarding-mock-menu-choice-grid">
        <div className="menu-choice">
          <strong>鉄火丼</strong>
          <span>750円</span>
        </div>
        <div className="menu-choice">
          <strong>中とろブツ盛り丼</strong>
          <span>900円</span>
        </div>
        <div className="menu-choice active">
          <strong>特上まぐろ丼</strong>
          <span>1,600円</span>
        </div>
        <div className="menu-choice">
          <strong>鉄人巻き</strong>
          <span>1,400円</span>
        </div>
      </div>
      <MockSectionTitle subtitle="Quick record" title="かんたん記録" />
      <div className="onboarding-mock-card onboarding-mock-quick-card">
        <p className="onboarding-mock-mini-text">
          特上まぐろ丼の標準部位を自動でセットしました。わからなければ、このまま保存でOKです。
        </p>
        <div className="onboarding-mock-parts-mini">
          {["大トロ", "中トロ", "赤身", "脳天", "ほほ肉", "目裏"].map((name) => (
            <span className="onboarding-mock-part-chip onboarding-mock-part-chip--on" key={name}>
              {name}
            </span>
          ))}
        </div>
        <p className="onboarding-mock-quick-help">薬味や海苔などの添え物は、自動では入れていません。</p>
        <div className="onboarding-mock-quick-actions">
          <div className="onboarding-mock-outline-fake">部位調整を閉じる</div>
          <div className="onboarding-mock-outline-fake">味のメモも残す</div>
        </div>
      </div>
      <MockSectionTitle subtitle="Parts" title="入っていた部位を調整" />
      <div className="onboarding-mock-parts-grid">
        {[
          ["大トロ", "腹部"],
          ["中トロ", "背部・腹部"],
          ["赤身", "背中"],
          ["脳天", "頭頂"],
          ["ほほ肉", "頭部"],
          ["目裏", "頭部"],
        ].map(([name, area]) => {
          const selected = name !== "中トロ";
          return (
            <div className={`onboarding-mock-part-card${selected ? " onboarding-mock-part-card--on" : ""}`} key={name}>
              <div className="onboarding-mock-part-card-head">
                <span className="onboarding-mock-part-card-name">{name}</span>
                {selected ? <span className="onboarding-mock-part-card-check">✓</span> : null}
              </div>
              <p className="onboarding-mock-part-card-area">{area}</p>
              <p className="onboarding-mock-part-card-meta">レア度: ★★★</p>
            </div>
          );
        })}
      </div>
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
        <div className="onboarding-mock-progress-big">100%</div>
        <div className="onboarding-mock-pbar">
          <div className="onboarding-mock-pbar-fill onboarding-mock-pbar-fill--aka" style={{ width: "100%" }} />
        </div>
        <p className="onboarding-mock-cap">6 / 6 部位</p>
        <div className="onboarding-mock-outline-btn">図鑑の進捗をシェア</div>
      </div>
      <div className="onboarding-mock-card onboarding-mock-complete-callout">全6部位コンプリートおめでとうございます🎉</div>
      <MockSectionTitle subtitle="Tuna map" title="部位マップ" />
      <div className="onboarding-mock-tuna-map" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- モックの静的画像 */}
        <img alt="" className="onboarding-mock-tuna-map-img" src={publicPath("/tuna-map.jpg")} />
      </div>
      <p className="onboarding-mock-map-help">タップで部位の詳細を表示。記録済みの部位だけ色付きイラストが重なります</p>
      <MockSectionTitle subtitle="All parts" title="部位一覧" />
      <div className="onboarding-mock-zukan-card-grid">
        {[
          ["大トロ", "腹部 / レア度: ★★★", "脂の王様"],
          ["中トロ", "背部・腹部 / レア度: ★★★", "上品なバランス"],
          ["赤身", "背中 / レア度: ★★☆", "旨味の王道"],
          ["脳天", "頭頂 / レア度: ★★★", "大トロ級のとろける食感"],
        ].map(([name, meta, desc]) => (
          <div className="onboarding-mock-zukan-card" key={name}>
            <p className="onboarding-mock-zukan-card-name">{name}</p>
            <p className="onboarding-mock-zukan-card-meta">{meta}</p>
            <p className="onboarding-mock-zukan-card-desc">{desc}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function MockQuiz() {
  return (
    <>
      <MockNoren>まぐろクイズ</MockNoren>
      <div className="onboarding-mock-share-bonus-wrap">
        <ShareBonusCallout compact variant="quiz" />
      </div>
      <div className="onboarding-mock-card onboarding-mock-quiz-master">
        <p className="onboarding-mock-quiz-label">👑 まぐろマスターへの道</p>
        <div className="onboarding-mock-quiz-master-h">
          <span>0%</span>
        </div>
        <div className="onboarding-mock-pbar">
          <div className="onboarding-mock-pbar-fill onboarding-mock-pbar-fill--aka" style={{ width: "0%" }} />
        </div>
        <p className="onboarding-mock-cap">正解済み0/1000</p>
      </div>
      <p className="onboarding-mock-quiz-hint">各ステージ10問。全ての問題に正解すると次のステージが解放</p>
      <div className="onboarding-mock-quiz-nav">
        <span className="onboarding-mock-nav-dot">◀</span>
        <div className="onboarding-mock-quiz-stage-card">
          <span className="onboarding-mock-qsl">STAGE 1</span>
          <span className="onboarding-mock-qst">入門</span>
          <span className="onboarding-mock-qsd">まぐろの部位を覚える10問 ・ 正解済み0/10</span>
        </div>
        <span className="onboarding-mock-nav-dot">▶</span>
      </div>
      <div className="onboarding-mock-card onboarding-mock-quiz-question-card">
        <div className="onboarding-mock-quiz-progress">
          <span>部位</span>
          <span>1 / 10</span>
        </div>
        <p className="onboarding-mock-quiz-question">「赤身」のレア度はいくつ？</p>
        <div className="onboarding-mock-quiz-options">
          {["2", "3", "不明", "1"].map((label, index) => (
            <div className="onboarding-mock-quiz-option" key={label}>
              <span className="onboarding-mock-quiz-option-label">{String.fromCharCode(65 + index)}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="onboarding-mock-quiz-submit">この回答で判定</div>
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
        <p className="onboarding-mock-hero-title">まぐろ入門者</p>
        <p className="onboarding-mock-hero-sub">来店 10回 ・ 6部位コンプ</p>
      </div>
      <div className="onboarding-mock-stats-row">
        <div className="onboarding-mock-stat">
          <span className="onboarding-mock-stat-num">1</span>
          <span className="onboarding-mock-stat-unit">回</span>
          <span className="onboarding-mock-stat-lbl">来店回数</span>
        </div>
        <div className="onboarding-mock-stat">
          <span className="onboarding-mock-stat-num">6</span>
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
            <div className="onboarding-mock-tr-name">まぐろ小僧</div>
          </div>
          <span className="onboarding-mock-chip-use">解放済み</span>
        </div>
        <div className="onboarding-mock-title-row onboarding-mock-title-row--locked">
          <span>🔒</span>
          <div>
            <div className="onboarding-mock-tr-name">まぐろ入門者</div>
            <div className="onboarding-mock-tr-meta">来店10回・100問正解で解放</div>
          </div>
        </div>
        <div className="onboarding-mock-title-row onboarding-mock-title-row--locked">
          <span>🔒</span>
          <div>
            <div className="onboarding-mock-tr-name">赤身の理解者</div>
            <div className="onboarding-mock-tr-meta">来店20回・5部位・200問正解で解放</div>
          </div>
        </div>
        <div className="onboarding-mock-title-row onboarding-mock-title-row--locked">
          <span>🔒</span>
          <div>
            <div className="onboarding-mock-tr-name">中とろ通</div>
            <div className="onboarding-mock-tr-meta">来店50回・5部位・500問正解で解放</div>
          </div>
        </div>
        <div className="onboarding-mock-title-row onboarding-mock-title-row--locked">
          <span>🔒</span>
          <div>
            <div className="onboarding-mock-tr-name">希少部位ハンター</div>
            <div className="onboarding-mock-tr-meta">来店75回・6部位・750問正解で解放</div>
          </div>
        </div>
        <div className="onboarding-mock-title-row onboarding-mock-title-row--locked">
          <span>🔒</span>
          <div>
            <div className="onboarding-mock-tr-name">まぐろマスター</div>
            <div className="onboarding-mock-tr-meta">来店100回・6部位・1000問正解で解放</div>
          </div>
        </div>
      </div>
    </>
  );
}

function MockAccount() {
  return (
    <>
      <MockNoren>設定</MockNoren>
      <div className="onboarding-mock-card onboarding-mock-account-settings">
        <p className="onboarding-mock-account-settings-title">見やすさ設定</p>
        <p className="onboarding-mock-account-settings-head">表示を軽くする / 文字を大きくする</p>
        <div className="onboarding-mock-account-setting-row">
          <span>表示モード</span>
          <div className="onboarding-mock-account-pill-row">
            <span className="onboarding-mock-account-pill onboarding-mock-account-pill--active">かんたん表示</span>
            <span className="onboarding-mock-account-pill">詳細表示</span>
          </div>
        </div>
        <div className="onboarding-mock-account-setting-row">
          <span>文字サイズ</span>
          <div className="onboarding-mock-account-pill-row">
            <span className="onboarding-mock-account-pill">標準</span>
            <span className="onboarding-mock-account-pill onboarding-mock-account-pill--active">大きめ</span>
          </div>
        </div>
      </div>
      <div className="onboarding-mock-card onboarding-mock-account-link-card">
        <p className="onboarding-mock-account-link-title">データのバックアップや引き継ぎができます</p>
        <div className="onboarding-mock-provider onboarding-mock-provider--plain">
          <span aria-hidden className="onboarding-mock-apple-mark">
            🍎
          </span>
          <span>Apple</span>
          <span className="onboarding-mock-provider-status">未連携</span>
          <span className="onboarding-mock-chev">›</span>
        </div>
        <div className="onboarding-mock-provider onboarding-mock-provider--plain">
          <span className="onboarding-mock-g-mark">G</span>
          <span>Google</span>
          <span className="onboarding-mock-provider-status">未連携</span>
          <span className="onboarding-mock-chev">›</span>
        </div>
        <div className="onboarding-mock-provider onboarding-mock-provider--plain">
          <span>✉️</span>
          <span>メールアドレス</span>
          <span className="onboarding-mock-provider-status">未連携</span>
          <span className="onboarding-mock-chev">›</span>
        </div>
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
            <div className="onboarding-mock-header-brand">
              {/* eslint-disable-next-line @next/next/no-img-element -- 縮小モック用に publicPath で静的参照 */}
              <img
                alt=""
                className="onboarding-mock-brand-img"
                height={26}
                src={publicPath("/brand/maguromaru-mark.png")}
                width={26}
              />
              <div className="onboarding-mock-header-text">
                <p className="onboarding-mock-header-title">{APP_INFO.appName}</p>
                <p className="onboarding-mock-header-sub">{APP_INFO.subtitle}</p>
              </div>
            </div>
            <div className="onboarding-mock-header-link">
              <SettingsGearIcon className="onboarding-mock-header-link-icon" size={12} />
            </div>
          </div>
          <div className="onboarding-mock-accent-line" />
        </header>

        <div className="onboarding-mock-body">
          <MockBody screen={screen} />
        </div>

        <nav aria-hidden className="onboarding-mock-tabbar">
          {MAIN_NAV_TABS.map((tab) => {
            const active = activeHref === tab.href;
            return (
              <div
                className={`onboarding-mock-tab${active ? " onboarding-mock-tab--active" : ""}`}
                key={tab.href}
              >
                <TabIcon className="onboarding-mock-tab-icon" name={tab.icon} />
                <span className="onboarding-mock-tab-label">{tab.stripLabel}</span>
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
