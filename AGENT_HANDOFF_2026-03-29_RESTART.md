# まぐろ丸ノート 引き継ぎメモ（2026-03-29 / 再起動用）

## 参照先
- 公開 URL: `https://maguromaru-note.vercel.app`
- 実装リポジトリ: `/mnt/c/Users/minou/maguromaru-note`
- 既存メモ: `/mnt/c/Users/minou/maguromaru-note/AGENT_HANDOFF_2026-03-29.md`

## 今回の到達点
- `https://maguromaru-note.vercel.app` は実運用寄りの Supabase ベース構成に移行済み
- 匿名認証 + Google / メール連携導線あり
- クイズは server-side session 採点
- シェアボーナス実装済み
- 現在は `10問固定 x 100ステージ = 1000問超` のクイズ構成まで反映済み

## 直近の本番反映
- 最新 production deploy: `dpl_AvjoCvGtNDPVRaN8hZGEnnHk1bm7`
- production alias: `https://maguromaru-note.vercel.app`
- black-box 確認: `curl -I https://maguromaru-note.vercel.app/quiz` で `HTTP/2 200`

## ブランチ / 作業木
- branch: `master`
- `git rev-parse HEAD`: `c141ef094d492289a47b4bf94449ae7f8080428c`
- ただし現在の変更は未 commit。working tree は大きく dirty

## このセッションまでの主要な実装経緯

### 1. UI / 情報設計
- 下タブを `ホーム / 記録 / 図鑑 / クイズ / マイページ` に整理
- `マイページ` を追加し、称号・統計・解放状況を独立表示
- ホームを `営業状況 + 天気` の統合カードと `本日の入荷状況` 中心に再構成
- ホーム下部にアカウント引き継ぎ導線を追加
- `図鑑` は独自の `TunaMap` 実装へ戻し、部位ラベルと説明を表示

### 2. 部位 / メニュー定義の見直し
- 追跡対象部位は現在この 6 部位
  - `大とろ / 中とろ / 赤身 / 脳天 / ほほ肉 / 目裏`
- `背とろ` は外向け表示では `中とろ` に統一
- `カマ` と `ハラモ` は図鑑追跡対象から外した
- `トビコ` は具材扱いで、図鑑対象外
- メニュー選択時の部位初期選択
  - 通常版 `まぐろ丼 / まぐろ丼ミニ` -> `赤身 / 中とろ / ほほ肉`
  - 特上 `特上まぐろ丼 / 特上まぐろ丼ミニ` -> `脳天 / ほほ肉 / 大とろ / 目裏 / 赤身`

### 3. 認証 / 実データ化
- ブラウザだけの mock ではなく Supabase 保存に移行
- 匿名認証セッション切れ時の再取得を強化
- `/account` を追加し、Google 連携 / メール登録 / ログインを追加
- ただし LINE 連携は未実装

### 4. 在庫 / 管理機能
- `menu_item_statuses` を使った個別在庫管理に変更
- `available / few / soldout` を管理画面から更新可能

### 5. クイズ機能の変遷
- ローカル自己採点を廃止し、server-side session 採点へ変更
- `answerProof` を使った即時判定を追加
- 正解 / 不正解と解説を各問題ごとに表示
- 回答形式は `正解をすべて選べ` の複数選択対応
- `赤身` のエリア問題は `腹部 / 背部` の両方を正解扱い
- 同じ問題が出続ける件は、直近セッション履歴を除外する形で改善

### 6. クイズ 100 ステージ化
- 旧仕様:
  - `10 / 20 / 30 / 40 / 50問` の5段階
  - `questionCount` がそのまま stage 代わり
- 新仕様:
  - `1ステージ = 常に10問`
  - `Stage 1..100`
  - 各ステージで累計 `10問` 正解すると次を開放
  - ステージごとに別問題プール
  - 後半ほど難易度を上げる
- 実装方針:
  - DB migration を追加せず、`question_ids` の stage 接頭辞から server-side に stage を再計算
  - `quiz_sessions.question_count` は新規セッションでは常に `10`
  - 過去データは `question_count / 10` 相当で後方互換推論
- 現在の問題総数:
  - `src/lib/quiz.ts` で `1000問超`。実際には `18候補 x 100 stage = 1800候補` ではなく、重複除去後の stage-specific question bank から各 stage へ 18 候補を配る構成
- 難易度帯:
  - Stage 1-20: 部位ベーシック
  - Stage 21-40: メニュー解析
  - Stage 41-60: 称号チャレンジ
  - Stage 61-80: 店舗・アプリ実践
  - Stage 81-100: 総合マスター

## 直近で触った主要ファイル
- クイズ定義: `/mnt/c/Users/minou/maguromaru-note/src/lib/quiz.ts`
- ステージ定義: `/mnt/c/Users/minou/maguromaru-note/src/lib/quiz-stages.ts`
- クイズ service: `/mnt/c/Users/minou/maguromaru-note/src/lib/services/app-service.ts`
- クイズ画面: `/mnt/c/Users/minou/maguromaru-note/src/components/screens/QuizScreen.tsx`
- shared schema: `/mnt/c/Users/minou/maguromaru-note/src/lib/domain/schemas.ts`
- 定数: `/mnt/c/Users/minou/maguromaru-note/src/lib/domain/constants.ts`
- グローバル CSS: `/mnt/c/Users/minou/maguromaru-note/src/app/globals.css`
- テスト:
  - `/mnt/c/Users/minou/maguromaru-note/tests/quiz.test.ts`
  - `/mnt/c/Users/minou/maguromaru-note/tests/service.test.ts`
  - `/mnt/c/Users/minou/maguromaru-note/tests/schemas.test.ts`

## DB migration 状況

### 適用済みとして扱っているもの
- `/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603290002_runtime_ready.sql`
  - `menu_item_statuses`
  - `quiz_sessions`
- `/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603290003_add_meura_part.sql`
  - `meura / 目裏` 追加
- `/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603290005_share_bonus.sql`
  - `quiz_sessions.score`
  - `share_bonus_events`

### 未確認 / 注意
- `/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603290004_rename_senaka_to_chutoro.sql`
  - `senaka` 行の物理名を `中とろ` にする update
  - コード側では外向け表示を `中とろ` に寄せているが、SQL 実行の最終確認はこのメモ作成時点では未確認

### 今回の 100 ステージ化で追加 migration は不要
- `stage_number` 列は追加していない
- `question_ids` の prefix から stage を推論する

## 本番で過去に出た不具合と修正
- `permission denied for table quiz_sessions`
  - 原因: `getAppSnapshot()` が service-role 必須テーブルを通常 client で読んでいた
  - 修正: `quiz_sessions` と `share_bonus_events` は service-role client で読むよう変更
- クイズ結果画面が一瞬で消える
  - 原因: `refresh()` 後にセッション初期化 `useEffect` が再実行
  - 修正: 結果表示中は再初期化しない
- クイズで問題が表示されない
  - 原因: `refresh` の不安定参照で session 生成ループ
  - 修正: `refresh` を安定化

## いまの認証 /データ保存の理解
- 来店記録、クイズ統計、在庫、シェアボーナスは Supabase 保存
- 匿名認証セッションが消えると「データが消える」のではなく「同一ユーザーとして見えなくなる」
- 再起動だけなら通常は維持される
- キャッシュ / クッキー削除後も引き継ぎたい場合は Google 連携かメール登録が必要

## 現在の残課題候補
- クイズ 100 ステージ UI は入ったが、さらに細かな UX 改善余地あり
  - stage page の見せ方
  - stage ごとの到達演出
  - 進捗可視化の強化
- `master` に未 commit の変更が大量にあるので、再起動後にまず差分確認が必要
- `AGENT_HANDOFF_2026-03-29.md` は古いので、今後はこのメモを優先参照した方がよい

## ローカル検証で通したコマンド
```bash
cd /mnt/c/Users/minou/maguromaru-note
npm run typecheck
npm test
npm run build
curl -I https://maguromaru-note.vercel.app/quiz
```

## 再開時の最初の指示例
```text
まず /mnt/c/Users/minou/maguromaru-note/AGENT_HANDOFF_2026-03-29_RESTART.md を読んでください。

公開先は https://maguromaru-note.vercel.app、
ローカルは /mnt/c/Users/minou/maguromaru-note です。

未 commit の差分が多いので、最初に git status と主要ファイル差分を確認してから続けてください。
```
