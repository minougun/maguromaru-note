# Claude Code Review Context: まぐろ丸ノート

## 参照元
- ローカル HTML モック: [`/mnt/c/Users/minou/maguromaru-note.html`](/mnt/c/Users/minou/maguromaru-note.html)
- Web 参照先 URL: `https://github.com/yaneurao/Pytra/`
- Web 参照先 URL: `https://github.com/minougun/makimura-app`
- 実装対象リポジトリ: [`/mnt/c/Users/minou/maguromaru-note`](/mnt/c/Users/minou/maguromaru-note)

## このファイルの目的
- Claude Code に、この実装の流れと現状を短時間で把握してもらうためのレビュー用コンテキストです。
- 特に、認可、入力検証、RLS、mock fallback、負のテストに重点を置いたレビューを期待しています。

## 実装の流れ
1. 新規 Next.js 16 / React 19 / TypeScript / Tailwind 4 アプリを [`/mnt/c/Users/minou/maguromaru-note`](/mnt/c/Users/minou/maguromaru-note) に作成。
2. モック HTML のデザインを基準に、`/`, `/record`, `/zukan`, `/mypage`, `/admin` を App Router で実装。
3. Supabase 向けに migration と RLS を追加。
4. UI から直接 DB に触らず、service/usecase 層に mutation を集約。
5. Supabase 環境変数がない場合でも画面確認できるよう、`/tmp` ベースの mock store を実装。
6. その後、コードレビューで見つかった権限問題を修正。

## 現在の主要構成

### アプリ層
- ルート:
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/page.tsx)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/record/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/record/page.tsx)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/zukan/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/zukan/page.tsx)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/mypage/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/mypage/page.tsx)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/admin/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/admin/page.tsx)
- API:
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/api/app-snapshot/route.ts`](/mnt/c/Users/minou/maguromaru-note/src/app/api/app-snapshot/route.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/api/visit-logs/route.ts`](/mnt/c/Users/minou/maguromaru-note/src/app/api/visit-logs/route.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/app/api/menu-status/route.ts`](/mnt/c/Users/minou/maguromaru-note/src/app/api/menu-status/route.ts)

### 業務ロジック
- service/usecase 集約:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/services/app-service.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/services/app-service.ts)
- 入力検証:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/domain/schemas.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/domain/schemas.ts)
- seed:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/domain/seed.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/domain/seed.ts)

### Supabase
- server/browser/proxy:
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/server.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/server.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/browser.ts`](/mnt/c/Users/minou/maguromaru-note/src/lib/supabase/browser.ts)
  - [`/mnt/c/Users/minou/maguromaru-note/src/proxy.ts`](/mnt/c/Users/minou/maguromaru-note/src/proxy.ts)
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

## 重要な設計判断

### 1. mutation を service/usecase 層に集約
- UI や route handler で直接永続化せず、`recordVisit()` と `upsertMenuStatus()` を経由させています。
- 入力検証は Zod で行い、その後に権限判定・保存処理を実施します。

### 2. 許可値を closed schema に寄せた
- `partIds` は enum 化。
- `menu_status.status` は `available | few | soldout` に固定。
- extra key と重複 part を拒否。

### 3. `/admin` は server-side で事前拒否
- 現在は [`/mnt/c/Users/minou/maguromaru-note/src/app/admin/page.tsx`](/mnt/c/Users/minou/maguromaru-note/src/app/admin/page.tsx) で `getViewerContext()` を呼び、staff 以外は `/` に `redirect()` しています。
- 更新 API 側でも staff 判定を実施しています。

### 4. staff 判定源を JWT claim に一本化
- 以前は app 側 env と DB 側 JWT claim が二重化していました。
- 現在は app 側も `user.app_metadata.role === 'staff'` で判定しています。

### 5. mock mode は既定で非 staff
- 以前は mock 時に全員 `staff` 扱いでした。
- 現在は `MAGUROMARU_ENABLE_MOCK_STAFF=true` を明示しない限り `user` です。

## 修正済みのレビュー指摘
- mock mode の全員 staff 化を撤廃。
- `/admin` を private page 化。
- staff 権限の真実源を一本化。
- 権限外 `menu_status` 更新の負のテストを追加。

## まだ見てほしい論点

### 認可
- `/admin` の server-side 拒否と API 側拒否で抜け道がないか。
- `app-snapshot` が staff 専用情報を含んでいないか。
- Supabase 実運用時、匿名ログインユーザーと staff ユーザーのセッション境界に穴がないか。

### 入力検証
- `recordVisitInputSchema` と `upsertMenuStatusInputSchema` に不足がないか。
- `photoDataUrl` の扱いが甘くないか。

### 状態と永続化
- `recordVisit()` の visit 作成と part 作成の整合性。
- 画像 upload 成功後に DB insert が失敗した場合の扱い。
- `menu_status` を current row 1件で持つ設計に問題がないか。

### RLS / DB
- migration の policy に漏れがないか。
- `storage.objects` policy と app 側の upload path 制約の二重化が適切か。
- `profiles` 自動生成 trigger の扱いに危険がないか。

### mock fallback
- env 未設定時の mock 動作が、本番誤設定時に危険な挙動をしないか。
- `/tmp/maguromaru-note-mock-db.json` の共有状態がレビュー観点で許容か。

### テスト
- 未追加の負のテストがないか。
- 可能なら次を見てほしい:
  - unauthorized `/admin` read
  - unauthorized `/api/menu-status` mutation
  - Supabase env あり時の staff / non-staff 分岐
  - upload 失敗時・DB insert 失敗時

## 現時点の未解消リスク
- 実 Supabase 環境での black-box 検証は未実施です。
- 未確認項目:
  - JWT `app_metadata.role=staff` とアプリ判定の実連携
  - RLS の実挙動
  - Storage policy の実挙動
  - Realtime の実反映
- `recordVisit()` は画像 upload 後に DB insert が失敗した場合、Storage 上のファイルを掃除していません。リーク許容か、ロールバックが必要かを見てほしいです。

## 実行済み検証
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Claude Code への依頼文例
```text
以下のリポジトリを、認可・入力検証・RLS・mock fallback・負のテストの観点でレビューしてください。

まず /mnt/c/Users/minou/maguromaru-note/CLAUDE_REVIEW_CONTEXT.md を読んでから、
/mnt/c/Users/minou/maguromaru-note 配下を確認してください。

出力は concrete findings のみで、severity, file path, rationale を含めてください。
問題がなければ no findings と書いてください。
```
