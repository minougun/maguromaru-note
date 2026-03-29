# Claude Code Review Context: まぐろ丸ノート

## 参照元
- ローカル仕様書: [`/mnt/c/Users/minou/Downloads/maguromaru-note-spec-v2 .md`](/mnt/c/Users/minou/Downloads/maguromaru-note-spec-v2%20.md)
- ローカル HTML モック: [`/mnt/c/Users/minou/maguromaru-note.html`](/mnt/c/Users/minou/maguromaru-note.html)
- Web 参照先 URL: `https://github.com/yaneurao/Pytra/`
- Web 参照先 URL: `https://github.com/minougun/makimura-app`
- 実装対象リポジトリ: [`/mnt/c/Users/minou/maguromaru-note`](/mnt/c/Users/minou/maguromaru-note)

## このファイルの目的
- Claude Code に現行アプリの構成と最近の変更点を短時間で把握してもらうためのレビュー用コンテキストです。
- 特に、認可、入力検証、RLS、mock fallback、負のテスト、最近入れた最適化の妥当性を見てほしいです。

## 現在の機能スコープ
- 画面:
  - `/`
  - `/record`
  - `/history`
  - `/zukan`
  - `/quiz`
  - `/admin`
- API:
  - `/api/app-snapshot`
  - `/api/visit-logs`
  - `/api/visit-logs/[id]`
  - `/api/quiz-results`
  - `/api/admin/status`
- `/mypage` と旧 `menu_status` API は廃止済みです。

## 現在の主要構成

### アプリ層
- ルート:
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/page.tsx)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/record/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/record/page.tsx)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/history/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/history/page.tsx)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/zukan/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/zukan/page.tsx)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/quiz/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/quiz/page.tsx)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/admin/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/admin/page.tsx)
- API:
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/api/app-snapshot/route.ts`](/mnt/c/Users/minou/maguromaru-note/src/app/api/app-snapshot/route.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/api/visit-logs/route.ts`](/mnt/c/Users/minou/maguromaru-note/src/app/api/visit-logs/route.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/api/visit-logs/[id]/route.ts`](/mnt/c/Users/minou/maguromaru-note/src/app/api/visit-logs/%5Bid%5D/route.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/api/quiz-results/route.ts`](/mnt/c/Users/minou/maguromaru-note/src/app/api/quiz-results/route.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/api/admin/status/route.ts`](/mnt/c/Users/minou/maguromaru-note/src/app/api/admin/status/route.ts)

### 業務ロジック
- service/usecase 集約:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/services/app-service.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/services/app-service.ts)
- 入力検証:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/domain/schemas.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/domain/schemas.ts)
- 称号ロジック:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/titles.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/titles.ts)
- クイズ生成:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/quiz.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/quiz.ts)
- seed:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/domain/seed.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/domain/seed.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/domain/constants.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/domain/constants.ts)

### Supabase
- server:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/server.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/server.ts)
- migration / RLS / Storage:
  - [`/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603280001_init.sql`](/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603280001_init.sql)

### mock fallback
- mock store:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/mock/store.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/mock/store.ts)
- env:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/env.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/env.ts)

### テスト
- [`/mnt/c/Users/minou/maguromaru-note/tests/schemas.test.ts`](/mnt/c/Users/minou/maguromaru-note/tests/schemas.test.ts)
- [`/mnt/c/Users/minou/maguromaru-note/tests/service.test.ts`](/mnt/c/Users/minou/maguromaru-note/tests/service.test.ts)
- [`/mnt/c/Users/minou/maguromaru-note/tests/quiz.test.ts`](/mnt/c/Users/minou/maguromaru-note/tests/quiz.test.ts)

## 重要な設計判断

### 1. mutation を service/usecase 層に集約
- UI や Route Handler で直接永続化せず、`recordVisit()` `deleteVisit()` `submitQuizResult()` `updateStoreStatusFromAccessToken()` を経由させています。
- 入力検証は Zod で行い、その後に権限判定・保存処理を実施します。

### 2. 許可値を closed schema に寄せた
- `partIds` `menuItemId` `questionCount` `store status` は allowlist で閉じています。
- extra key と重複 part を拒否しています。

### 3. `/admin` は server-side で事前拒否
- [`/mnt/c/Users/minou/maguromaru-note/src/app/admin/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/admin/page.tsx) で viewer を確認し、管理者以外は redirect しています。
- 更新 API 側でも access token と `ADMIN_EMAIL` を使って再検証しています。

### 4. mock mode は既定で非 admin
- `MAGUROMARU_ENABLE_MOCK_ADMIN=true` を明示しない限り管理者化しません。
- mock fallback は `/tmp/maguromaru-note-mock-db.json` を使います。

### 5. 称号は総合条件で判定
- `来店回数 + 部位数 + 累計クイズ正解数` の3条件で現在称号を決定します。
- 現条件:
  - `beginner`: 1回 / 部位不問 / クイズ不問
  - `akami_fan`: 3回 / 5種 / 200問
  - `chutoro`: 5回 / 5種 / 500問
  - `hunter`: 10回 / 6種 / 750問
  - `master`: 20回 / コンプ / 1000問

### 6. クイズは静的プール + seed 付きセッション
- クイズプールは 1000問以上になるようローカルで生成しています。
- 直近の最適化で、全件 sort シャッフルから部分 Fisher-Yates + cache に変更しました。

## 最近の変更
- `createQuizSession()` を `sort(() => random() - 0.5)` から部分 Fisher-Yates に変更。
- 同一 seed / count のセッションをメモ化。
- `getCurrentTitle()` の不要な `reverse()` を削除。
- snapshot 構築時の `visit_log_parts` 集約で毎回 sort していた処理を、一括 push 後に一回だけ sort するよう変更。
- `buildRecordedVisit()` の部位解決を `includes` から `Set` ベースに変更。
- クイズの決定性と重複なしを確認するテストを追加。

## まだ見てほしい論点

### 認可
- `/admin` の server-side 拒否と `/api/admin/status` 側拒否に抜け道がないか。
- `app-snapshot` が管理者専用情報を返していないか。
- Supabase 実運用時、匿名ユーザーと管理者のセッション境界に穴がないか。

### 入力検証
- `recordVisitInputSchema` `submitQuizResultInputSchema` `updateStoreStatusInputSchema` に不足がないか。
- `photoDataUrl` の形式チェックが甘くないか。

### 状態と永続化
- `recordVisit()` の visit 作成と part 作成の整合性。
- 画像 upload 成功後に DB insert が失敗した場合の cleanup。
- `quiz_stats` upsert の競合や更新条件。

### RLS / DB
- migration の policy に漏れがないか。
- `storage.objects` policy と app 側 upload path 制約の二重化が適切か。

### mock fallback
- env 未設定時の mock 動作が、本番誤設定時に危険な挙動をしないか。
- `/tmp/maguromaru-note-mock-db.json` の共有状態が許容か。

### 最適化の妥当性
- `createQuizSession()` の新実装に偏りや欠陥がないか。
- cache が不正な共有や破壊的変更を起こさないか。
- 現状の変更が premature optimization ではなく妥当か。

### テスト
- 未追加の負のテストがないか。
- 可能なら次を見てほしい:
  - unauthorized `/admin` read
  - unauthorized `/api/admin/status` mutation
  - Supabase env あり時の admin / non-admin 分岐
  - upload 失敗時・DB insert 失敗時

## 現時点の未解消リスク
- 実 Supabase 環境での black-box 検証は未実施です。
- 未確認項目:
  - `ADMIN_EMAIL` 実運用
  - RLS の実挙動
  - Storage policy の実挙動
  - 匿名認証 cookie の実挙動
  - Open-Meteo 取得の本番確認
- Pytra は確認したが、このコードベースは TS/Next.js なので直接適用はしていません。今回はアプリ側の実装最適化で対応しています。

## 実行済み検証
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Claude Code への依頼文例
```text
以下のリポジトリを、認可・入力検証・RLS・mock fallback・負のテスト・最近の最適化の妥当性の観点でレビューしてください。

まず /mnt/c/Users/minou/maguromaru-note/CLAUDE_REVIEW_CONTEXT.md を読んでから、
/mnt/c/Users/minou/maguromaru-note 配下を確認してください。

出力は concrete findings のみで、severity, file path, rationale を含めてください。
問題がなければ no findings と書いてください。
```
