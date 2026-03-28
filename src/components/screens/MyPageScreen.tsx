"use client";

import { useState } from "react";

import { ProfileCard } from "@/components/mypage/ProfileCard";
import { StatsGrid } from "@/components/mypage/StatsGrid";
import { TitlesList } from "@/components/mypage/TitlesList";
import { ShareModal } from "@/components/share/ShareModal";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";
import { buildTitleShare, type SharePayload } from "@/lib/share/share";

export function MyPageScreen() {
  const { snapshot, loading, error, refresh } = useAppSnapshot();
  const [sharePayload, setSharePayload] = useState<SharePayload | null>(null);

  if (loading) {
    return <ScreenState description="プロフィールを読み込んでいます。" title="読み込み中" />;
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

  return (
    <>
      <NorenBanner label="マイページ" />
      <ProfileCard onShare={() => setSharePayload(buildTitleShare(snapshot.myPage))} summary={snapshot.myPage} />
      <StatsGrid summary={snapshot.myPage} />
      <SectionTitle subtitle="Titles" title="称号" />
      <TitlesList summary={snapshot.myPage} />
      <Card>
        <p className="auth-note">
          匿名ログインで即利用できます。
          <br />
          Supabase 接続時はメール / Google 連携用のセッション基盤も有効です。
        </p>
      </Card>
      <ShareModal onClose={() => setSharePayload(null)} open={Boolean(sharePayload)} payload={sharePayload} />
    </>
  );
}
