# まぐろ丸ノート 引き継ぎメモ（2026-03-29 / push・deploy 後）

## 参照先
- 公開 URL: `https://maguromaru-note.vercel.app`
- GitHub リポジトリ: `https://github.com/minougun/maguromaru-note.git`
- ローカル実装パス: `/mnt/c/Users/minou/maguromaru-note`
- 直前の再起動メモ: `/mnt/c/Users/minou/maguromaru-note/AGENT_HANDOFF_2026-03-29_RESTART.md`

## このセッションで完了したこと
- dirty な作業木を確認し、既存実装が壊れていないことを確認
- OAuth コールバック後のセッション cookie を落としうる不具合を修正
- 変更一式を commit
- 新規 GitHub repo を作成して push
- Vercel production へ deploy
- Vercel の Git 連携で `minougun/maguromaru-note` を connect

## 現在の到達点
- 本番 URL は `https://maguromaru-note.vercel.app`
- GitHub repo は `https://github.com/minougun/maguromaru-note.git`
- ローカル branch は `master`
- 最新 commit:
  - `44fdf83` `Ship Supabase-backed quiz stages and account flows`
- production deploy:
  - deploy ID: `dpl_Cyx8nMHnbpygBAKTQn4TdkE5Gz2x`
  - deploy URL: `https://maguromaru-note-dfsomj7zn-minouguns-projects.vercel.app`

## 今回の重要修正

### OAuth コールバックの cookie 保持修正
- 対象ファイル:
  - `/mnt/c/Users/minou/maguromaru-note/src/app/auth/callback/route.ts`
  - `/mnt/c/Users/minou/maguromaru-note/src/lib/response.ts`
  - `/mnt/c/Users/minou/maguromaru-note/tests/response.test.ts`
- 内容:
  - `exchangeCodeForSession()` 後に `NextResponse.redirect()` を新規生成すると、セット済み cookie が失われうる構造だった
  - 既存レスポンスを維持したまま `Location` だけ差し替えるよう修正
  - cookie が残ることをテスト追加で固定

## この作業までに入っている主要機能
- Supabase ベースの実運用寄り構成
- 匿名認証 + Google / メール連携導線
- server-side session 採点クイズ
- シェアボーナス
- `10問固定 x 100ステージ`
- マイページ追加
- 部位追跡は `大とろ / 中とろ / 赤身 / 脳天 / ほほ肉 / 目裏`
- 管理画面から `menu_item_statuses` を更新

## 検証結果
ローカル `/mnt/c/Users/minou/maguromaru-note` で以下を通過:

```bash
npm run typecheck
npm test
npm run build
```

本番反映:

```bash
npx vercel --prod
```

## Git / Vercel の現在状態
- GitHub repo は新規作成済み
- `origin` は `https://github.com/minougun/maguromaru-note.git`
- `master` は `origin/master` へ push 済み
- Vercel project `maguromaru-note` は GitHub repo `minougun/maguromaru-note` と接続済み

## 作業木の状態
- アプリ本体の変更は push 済み
- ローカルの未管理/未 commit 差分は `.claude/` 配下の作業ログのみ
- したがって、次回作業開始時は `.claude/` を無視すればよい

## DB migration メモ
- 既存メモの通り、以下はコード側で前提にしている
  - `/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603290002_runtime_ready.sql`
  - `/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603290003_add_meura_part.sql`
  - `/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603290005_share_bonus.sql`
- 未確認注意:
  - `/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603290004_rename_senaka_to_chutoro.sql`
  - 物理データ更新の最終確認は別途必要

## 次に見るとよい場所
- クイズ定義:
  - `/mnt/c/Users/minou/maguromaru-note/src/lib/quiz.ts`
- ステージ定義:
  - `/mnt/c/Users/minou/maguromaru-note/src/lib/quiz-stages.ts`
- 業務ロジック:
  - `/mnt/c/Users/minou/maguromaru-note/src/lib/services/app-service.ts`
- クイズ画面:
  - `/mnt/c/Users/minou/maguromaru-note/src/components/screens/QuizScreen.tsx`
- 認証画面:
  - `/mnt/c/Users/minou/maguromaru-note/src/components/screens/AccountScreen.tsx`

## 残課題候補
- クイズ 100 ステージ UI/UX の仕上げ
  - stage ごとの演出
  - 進捗可視化
  - 到達感の強化
- Supabase 側 migration 実適用の最終確認
- 本番 black-box 確認の追加
  - `private API`
  - `admin`
  - `OAuth callback`
  - `share bonus`

## 再開時の最初の指示例
```text
まず /mnt/c/Users/minou/maguromaru-note/AGENT_HANDOFF_2026-03-29_FINAL.md を読んでください。

公開先は https://maguromaru-note.vercel.app、
GitHub は https://github.com/minougun/maguromaru-note.git、
ローカルは /mnt/c/Users/minou/maguromaru-note です。

.claude を除けば app 本体は push 済みです。必要な差分確認から始めてください。
```
