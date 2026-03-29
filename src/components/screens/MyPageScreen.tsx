"use client";

import { useRouter } from "next/navigation";

import { useAuthState } from "@/components/providers/AuthProvider";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildMyPageSummary } from "@/lib/mypage";
import { signOutSupabase } from "@/lib/supabase/browser";
import { formatCount } from "@/lib/utils/format";

export function MyPageScreen() {
  const router = useRouter();
  const auth = useAuthState();
  const { snapshot, loading, error, refresh } = useAppSnapshot();

  if (loading) {
    return <ScreenState description="マイページを読み込んでいます。" title="読み込み中" />;
  }

  if (error || !snapshot) {
    return (
      <ScreenState
        action={
          <button className="button-outline" onClick={() => void refresh()} type="button">
            再読み込み
          </button>
        }
        description={error ?? "マイページを表示できません。"}
        title="表示に失敗しました"
      />
    );
  }

  const summary = buildMyPageSummary(snapshot);
  const currentTitle = summary.currentTitle;
  const heroTitle = currentTitle?.name ?? "まだ称号なし";
  const heroIcon = currentTitle?.icon ?? "🔒";
  const heroSubline =
    currentTitle === null
      ? "来店とクイズで称号を解放"
      : `来店 ${formatCount(summary.visitCount)}回 ・ ${summary.collectedCount}部位コンプ`;

  return (
    <>
      <NorenBanner label="マイページ" />

      <Card className="mypage-hero-card" glow>
        <div className="mypage-hero-emblem">
          <div className="mypage-hero-icon">{heroIcon}</div>
        </div>
        <h2 className="mypage-hero-title">{heroTitle}</h2>
        <p className="mypage-hero-sub">{heroSubline}</p>
      </Card>

      <div className="stats-grid mypage-stats-grid">
        <div className="stat-cell mypage-stat-cell">
          <div className="mypage-stat-value">
            <span className="stat-num">{formatCount(summary.visitCount)}</span>
            <span className="mypage-stat-unit">回</span>
          </div>
          <div className="stat-label">来店回数</div>
        </div>
        <div className="stat-cell mypage-stat-cell">
          <div className="mypage-stat-value">
            <span className="stat-num">{summary.collectedCount}</span>
            <span className="mypage-stat-unit">種</span>
          </div>
          <div className="stat-label">食べた部位</div>
        </div>
        <div className="stat-cell mypage-stat-cell">
          <div className="mypage-stat-value">
            <span className="stat-num">{summary.streakWeeks}</span>
            <span className="mypage-stat-unit">週</span>
          </div>
          <div className="stat-label">連続来店</div>
        </div>
      </div>

      <SectionTitle subtitle="Titles" title="称号" />
      <Card>
        {summary.titles.map((title) => (
          <div className={`title-row ${title.current ? "current" : ""} ${title.unlocked ? "" : "locked"}`} key={title.id}>
            <div className={`title-icon ${title.current ? "current" : ""}`}>{title.unlocked ? title.icon : "🔒"}</div>
            <div className="title-copy">
              <div className="title-name">{title.name}</div>
              <div className="title-meta">{title.unlocked ? "解放済み" : title.requirementText}</div>
            </div>
            {title.current ? <span className="title-status-chip">使用中</span> : null}
          </div>
        ))}
      </Card>

      {auth.usingSupabase ? (
        <Card>
          <p className="account-copy">別のアカウントに切り替える場合はログアウトしてください。</p>
          <button
            className="button-outline inline-button"
            onClick={() => {
              void (async () => {
                await signOutSupabase();
                router.push("/");
                router.refresh();
              })();
            }}
            type="button"
          >
            ログアウト
          </button>
        </Card>
      ) : null}
    </>
  );
}
