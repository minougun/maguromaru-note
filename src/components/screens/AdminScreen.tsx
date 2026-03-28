"use client";

import { AdminStatusPanel } from "@/components/admin/AdminStatusPanel";
import { Card } from "@/components/ui/Card";
import { NorenBanner } from "@/components/ui/NorenBanner";
import { ScreenState } from "@/components/ui/ScreenState";
import { useAppSnapshot } from "@/lib/hooks/use-app-snapshot";

export function AdminScreen() {
  const { snapshot, loading, error, refresh } = useAppSnapshot();

  if (loading) {
    return <ScreenState description="管理画面を読み込んでいます。" title="読み込み中" />;
  }

  if (error || !snapshot) {
    return (
      <ScreenState
        action={
          <button className="button-outline" onClick={() => void refresh()} type="button">
            再読み込み
          </button>
        }
        description={error ?? "管理画面を表示できません。"}
        title="表示に失敗しました"
      />
    );
  }

  return (
    <>
      <NorenBanner label="店舗管理" />
      <div className="muted-banner">
        staff 権限の server-side 認可を通った更新だけを許可します。Supabase 未接続時は `MAGUROMARU_ENABLE_MOCK_STAFF=true` を明示した場合だけ mock staff で確認できます。
      </div>
      <AdminStatusPanel entries={snapshot.home.menuStatus} onUpdated={refresh} />
      <Card>
        <p className="helper-text">
          1タップで `menu_status` を更新します。許可値は `available / few / soldout` に固定しています。
        </p>
      </Card>
    </>
  );
}
