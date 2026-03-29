# まぐろ丸ノート 引き継ぎメモ

## 参照元
- ローカル仕様書: [`/mnt/c/Users/minou/Downloads/maguromaru-note-spec-v2 .md`](/mnt/c/Users/minou/Downloads/maguromaru-note-spec-v2%20.md)
- ローカル HTML モック: [`/mnt/c/Users/minou/maguromaru-note.html`](/mnt/c/Users/minou/maguromaru-note.html)
- Web 参照先 URL: `https://github.com/yaneurao/Pytra/`
- 実装対象リポジトリ: [`/mnt/c/Users/minou/maguromaru-note`](/mnt/c/Users/minou/maguromaru-note)
- 公開 URL: `https://maguromaru-note.vercel.app`

## このファイルの目的
- 別の AI エージェントに、ここまでの実装経緯と現在のブロッカーを短時間で引き継ぐためのメモです。
- 特に「本番で `ログインが必要です。` が出続ける件」の調査再開を意図しています。

## 現在の結論
- アプリは Vercel + Supabase 本番構成に切り替え済みで、mock 前提ではない。
- Supabase 側で匿名認証は有効化済み。
- Supabase 側で migration は適用済み。
- `menu_items` は本番 DB 上で `まぐろ丼 / 水 / お茶 / コーラ` になっている。
- それでも実ブラウザではトップ画面で `表示に失敗しました / ログインが必要です。` が出続ける。
- ローカルの `npm test` `npm run typecheck` `npm run lint` `npm run build` は毎回通っている。

## 直近の本番 deployment
- 最新 production deployment:
  - `dpl_F5SeEtcPVXALeTeh6L8nrZnLDZuz`
- 直前の deployment:
  - `dpl_GF7uf6DAqMyFhSPfzggoCUS6iRAQ`
  - `dpl_8ifHANGguryP3o1AGH3t7CX59LXM`
  - `dpl_6mLnksLqtJGvBVwddyRsjPQArC7C`
  - `dpl_FMwgrLEyCUiqE6JQeuENFTXK4KGx`
- 公開 URL:
  - `https://maguromaru-note.vercel.app`

## 現在の主要ファイル
- 認証初期化:
  - [`/mnt/c/Users/minou/maguromaru-note/src/components/providers/AuthProvider.tsx`](/mnt/c/Users/minou/maguromaru-note/src/components/providers/AuthProvider.tsx)
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/browser.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/browser.ts)
- snapshot 取得:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/hooks/use-app-snapshot.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/hooks/use-app-snapshot.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/api/app-snapshot/route.ts`](/mnt/c/Users/minou/maguromaru-note/src/app/api/app-snapshot/route.ts)
- service/usecase:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/services/app-service.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/services/app-service.ts)
- Supabase server/middleware:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/server.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/server.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/middleware.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/middleware.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/proxy.ts`](/mnt/c/Users/minou/maguromaru-note/src/proxy.ts)
- DB migration:
  - [`/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603280001_init.sql`](/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603280001_init.sql)

## 仕様変更の反映状況
- 旧メニューは削除済み。
- 現行メニューは以下に統一済み。
  - `まぐろ丼`
  - `水`
  - `お茶`
  - `コーラ`
- `味噌汁` はコード・seed・migration から除去済み。
- 関連ファイル:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/domain/seed.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/domain/seed.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/quiz.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/quiz.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603280001_init.sql`](/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603280001_init.sql)

## クイズ関連
- クイズは 1000 問以上の静的プール。
- 4択崩れは修正済み。
- 問題生成は固定 seed + partial Fisher-Yates。
- 関連ファイル:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/quiz.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/quiz.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/tests/quiz.test.ts`](/mnt/c/Users/minou/maguromaru-note/tests/quiz.test.ts)

## 称号仕様
- 条件は次の通りに変更済み。
  - `まぐろ入門者`: 来店 1 回、部位不問、クイズ不問
  - `赤身の理解者`: 来店 3 回、部位 5 種、クイズ 200 問
  - `中トロ通`: 来店 5 回、部位 5 種、クイズ 500 問
  - `希少部位ハンター`: 来店 10 回、部位 6 種、クイズ 750 問
  - `一頭理解者`: 来店 20 回、部位コンプ、クイズ 1000 問
- 関連ファイル:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/domain/constants.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/domain/constants.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/titles.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/titles.ts)

## Supabase / 本番設定で実施済みのこと
- Vercel env 登録済み:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_EMAIL`
  - `NEXT_PUBLIC_SITE_URL`
  - `MAGUROMARU_ENABLE_PRODUCTION_MOCK=false`
- Supabase で `Allow anonymous sign-ins` は ON。
- SQL Editor で migration を手動実行済み。

## black-box で確認できたこと
- `curl -I https://maguromaru-note.vercel.app` は `HTTP/2 200`
- 匿名トークン付き `GET /api/app-snapshot` は 200 を返せる
  - これはローカル Node から `supabase.auth.signInAnonymously()` で token を作り、その token を `Authorization: Bearer ...` に付けたときに確認済み
- service role で本番 DB を読むと以下が存在する
  - `menu_items`
  - `store_status`
- 匿名の直接 PostgREST 読み取りは `permission denied`
  - これは RLS/GRANT が効いている確認としては正しい

## それでも未解決の不具合
- 実ブラウザではホーム画面で `表示に失敗しました / ログインが必要です。`
- プライベートモードでも再現
- つまり「匿名セッションの作成そのもの」ではなく、「ブラウザ実行時の token 反映タイミング」か「SSR/CSR 境界」でまだズレている可能性が高い

## ここまでの対策

### 対策 1
- cookie 同期だけに頼らず、ブラウザから API に `Authorization: Bearer <access_token>` を明示送信する方式へ変更。
- 対象:
  - `app-snapshot`
  - `visit-logs`
  - `quiz-results`
  - `admin/status`

### 対策 2
- `AuthProvider` が匿名認証で取得した `accessToken` を context に保持。
- 各 fetch はその `accessToken` を使用。

### 対策 3
- `useAppSnapshot()` で
  - `auth.ready === false` の間は fetch しない
  - `usingSupabase === true && accessToken === null && error === null` の間も fetch しない

### 対策 4
- `waitForSupabaseAccessToken()` を追加して、匿名認証直後に session が見えるまで polling。

### 対策 5
- `onAuthStateChange()` の `null session` 中間イベントを無視するよう変更。
- token なしで `ready: true` にしないよう寄せた。

## 現時点で最も疑わしい箇所
- [`/mnt/c/Users/minou/maguromaru-note/src/components/providers/AuthProvider.tsx`](/mnt/c/Users/minou/maguromaru-note/src/components/providers/AuthProvider.tsx)
- [`/mnt/c/Users/minou/maguromaru-note/src/lib/hooks/use-app-snapshot.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/hooks/use-app-snapshot.ts)
- [`/mnt/c/Users/minou/maguromaru-note/src/lib/services/app-service.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/services/app-service.ts)
- [`/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/server.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/server.ts)
- [`/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/middleware.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/middleware.ts)

## 次にやるべきこと
1. ブラウザ実機で `AuthProvider` の state を一時表示する
   - `ready`
   - `usingSupabase`
   - `accessToken` の有無
   - `error`
2. `useAppSnapshot()` の fetch 前に診断ログを出す
   - token が本当に付いているか
3. `/api/app-snapshot` 側で一時的に `authorization header present / absent` と `getUser()` 結果をサーバーログで確認する
4. 必要なら、cookie ベースを捨てて
   - route handler は Bearer token のみで viewer を確定
   - server component / admin page も client-only へ寄せる
5. 最短で潰すなら、一時的な診断ビルドを公開してでも原因を画面に出す

## セキュリティ上の現状
- service/usecase 集約は維持
- allowlist schema は維持
- mutation には rate limit あり
- admin は server-side と API 両方で再検証
- 匿名の直接 DB read は不可

## ローカルで通っている検証
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## 他エージェント向け依頼文例
```text
まず /mnt/c/Users/minou/maguromaru-note/AGENT_HANDOFF_2026-03-28.md を読んでください。

目的は、https://maguromaru-note.vercel.app で
「表示に失敗しました / ログインが必要です。」
が出続ける原因を特定して修正することです。

補足:
- Supabase 匿名認証は ON
- migration は適用済み
- 本番 DB の menu_items は正しい
- token 付き /api/app-snapshot は 200 を返せる
- それでも実ブラウザでは失敗する

見てほしい論点:
- AuthProvider の race
- CSR での token 取得タイミング
- route handler への Bearer token 伝搬
- server-side supabase client と cookie 経路の干渉
- 最小診断コードを入れるならどこか
```
