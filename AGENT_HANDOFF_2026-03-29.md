# まぐろ丸ノート 引き継ぎメモ（2026-03-29）

## 参照元
- ローカル仕様書: `/mnt/c/Users/minou/Downloads/maguromaru-note-spec-v2 .md`
- ローカル HTML モック: `/mnt/c/Users/minou/maguromaru-note.html`
- 実装対象リポジトリ: `/mnt/c/Users/minou/maguromaru-note`
- 公開 URL: `https://maguromaru-note.vercel.app`
- まぐろ部位イラスト原本: `/mnt/c/Users/minou/Downloads/22686742.jpg`

## 前回引き継ぎからの経緯
前回（`AGENT_HANDOFF_2026-03-28.md`）の主要課題だった**本番認証バグ**（「ログインが必要です。」が出続ける）は解決済み。
- 原因: `browser.ts` が `env.ts` の動的 `process.env[name]` アクセスを使っていたため、Next.js ビルド時にクライアント側で env が undefined になっていた
- 修正: `process.env.NEXT_PUBLIC_*` への直接アクセスに変更

## 今回のセッションで実施した作業

### 1. メニュー変更
- **削除**: 水(¥100)、お茶(¥300)、コーラ(¥300)
- **追加/変更**:
  - まぐろ丼 ¥2,000（既存）
  - まぐろ丼ミニ ¥1,500（新規）
  - 特上まぐろ丼（大トロ入り） ¥3,000（新規）
  - 特上まぐろ丼ミニ ¥2,500（新規）
- 対象ファイル:
  - `/mnt/c/Users/minou/maguromaru-note/src/lib/domain/seed.ts`
  - `/mnt/c/Users/minou/maguromaru-note/src/lib/domain/constants.ts`
  - `/mnt/c/Users/minou/maguromaru-note/supabase/migrations/202603280001_init.sql`

### 2. TabBar 変更（5タブ→4タブ）
- 削除: 「履歴」タブ
- 現在の構成: ホーム / 記録 / 図鑑 / クイズ
- 対象ファイル:
  - `/mnt/c/Users/minou/maguromaru-note/src/components/ui/TabBar.tsx`
  - `/mnt/c/Users/minou/maguromaru-note/src/app/globals.css`（`grid-template-columns: repeat(4, 1fr)`）

### 3. ホーム画面リニューアル
- **追加**: 「本日の入荷状況」セクション（NorenBanner + メニュー一覧 + ステータスバッジ）
- **削除**: 「まぐろクイズ」セクション（ユーザー判断で不要）
- **維持**: 天気バー、営業状況、本日のおすすめ、最近の記録
- 対象ファイル:
  - `/mnt/c/Users/minou/maguromaru-note/src/components/screens/HomeScreen.tsx`

### 4. 図鑑ページ：まぐろ部位マップ復活
- `TunaMap.tsx` を新規作成
- `/public/tuna-map.jpg` にまぐろイラストを配置（SVG背景として使用）
- 8部位の位置をイラストに合わせて配置
- **タップで詳細表示**: 部位をタップすると下に詳細カード（名前、エリア、レア度、説明、記録済み/未記録）が表示
- **食べた部位は色付き+グロー**、未食は黒い点線
- イラストに名前がある部位（脳天, ほほ肉, カマ, 中トロ, 赤身）はラベルなし
- イラストにない部位（大とろ, 背とろ, ハラモ）のみラベル+引き出し線あり
- 「コンプリート進捗」ラベルを進捗%の上に追加
- 「まぐろクイズへ」の導線カードを削除
- ヒントテキスト: 「タップで部位の詳細を表示 ・ 色付き＝食べた部位」
- 対象ファイル:
  - `/mnt/c/Users/minou/maguromaru-note/src/components/TunaMap.tsx`
  - `/mnt/c/Users/minou/maguromaru-note/src/components/screens/ZukanScreen.tsx`

### 5. 部位名の表記統一
- 「背トロ」→「背とろ」（ひらがな統一）
- seed.ts + migration 両方を修正済み

### 6. ヘッダーUI変更
- タイトル: 17px→22px、letter-spacing 3px
- サブタイトル: 10px→11px、letter-spacing 1px
- 二重線を解消: `border-bottom` 削除
- アクセントライン: 左の赤→右にフェードして消えるグラデーション
- 対象ファイル:
  - `/mnt/c/Users/minou/maguromaru-note/src/app/globals.css`
  - `/mnt/c/Users/minou/maguromaru-note/src/app/layout.tsx`

### 7. QuizScreen の修正
- 「称号を確認する」リンクを `/history` → `/` に変更
- 対象ファイル:
  - `/mnt/c/Users/minou/maguromaru-note/src/components/screens/QuizScreen.tsx`

## 本番DBに対して手動SQLが必要な作業

Supabase SQL Editor で以下を実行する必要がある:

```sql
-- メニュー名・価格の更新
UPDATE public.menu_items SET name = 'まぐろ丼ミニ', price = 1500 WHERE id = 'maguro_don_mini';
UPDATE public.menu_items SET name = '特上まぐろ丼（大トロ入り）', price = 3000 WHERE id = 'tokujo_don';
UPDATE public.menu_items SET name = '特上まぐろ丼ミニ', price = 2500 WHERE id = 'tokujo_don_mini';

-- 部位名の表記統一
UPDATE public.parts SET name = '背とろ' WHERE id = 'senaka';
```

## 現在のルート構成
| パス | 状態 | 備考 |
|------|------|------|
| `/` | ○ 稼働中 | HomeScreen |
| `/record` | ○ 稼働中 | RecordScreen |
| `/zukan` | ○ 稼働中 | ZukanScreen + TunaMap |
| `/quiz` | ○ 稼働中 | QuizScreen |
| `/history` | △ 残存 | タブからのリンクは削除済み。ページファイルは残っている |
| `/admin` | ○ 稼働中 | AdminScreen |
| `/api/auth-debug` | △ 残存 | 診断用エンドポイント、削除推奨 |

## 現在のタブ構成（4タブ）
ホーム(🏠) / 記録(✏️) / 図鑑(📖) / クイズ(🐟)

## モックとの差分（未対応）
- **マイページタブ**: モックには「マイページ(👤)」タブがあり、来店回数・称号・統計を表示する画面がある。現在のアプリにはない（履歴画面の一部機能が対応するが、タブからは削除済み）
- **入荷状況の個別管理**: 現在はメニュー全品が営業ステータスに連動した一律表示。メニューごとの available/few/soldout 管理は管理画面の拡張が必要
- **`/history` ルート削除**: ファイルは残存しているが、タブからの導線はない。完全削除するかマイページに統合するか要判断

## デプロイ
- **変更後は必ずデプロイすること**（ユーザー明示指示）
- コマンド: `npx vercel --prod`
- フロー: コード変更 → `npm run typecheck` → `npm run build` → `git commit` → `npx vercel --prod`

## Vercel 環境変数（設定済み）
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `NEXT_PUBLIC_SITE_URL`
- `MAGUROMARU_ENABLE_PRODUCTION_MOCK=false`

## 技術スタック
- Next.js 16.1.6（App Router, Turbopack）
- React 19
- TypeScript
- Tailwind 4
- Supabase（匿名認証, RLS, Storage）
- Vercel（本番ホスティング）
- `@supabase/ssr@0.9.0`

## ローカル検証コマンド
```bash
npm run typecheck  # TypeScript型チェック
npm run lint       # ESLint（既知の1件 use-app-snapshot.ts の setState警告あり）
npm test           # 27テスト全通過
npm run build      # Next.jsビルド
```

## 直近のコミット履歴
```
c141ef0 Header: remove double line, fade-right gradient accent
6f5d516 Add otoro label, rename 背トロ→背とろ, enlarge header title
65eced4 Add labels for senaka and haramo (not in illustration)
b76f0b3 Zukan: black dashed lines, add progress label, remove quiz link
277f816 Add tap-to-view part detail on tuna map
4b07e47 Remove duplicate part labels from tuna map SVG
7fd1495 Add tuna illustration to map and fix part positions
6938fec UI redesign: menu update, tab bar, tuna map, stock status
```

## 他エージェント向け依頼文例
```text
まず /mnt/c/Users/minou/maguromaru-note/AGENT_HANDOFF_2026-03-29.md を読んでください。

このアプリの UI 改善の続きです。

補足:
- 変更後は必ず npx vercel --prod でデプロイすること
- npm run typecheck / build が通ることを確認してからコミット
- 本番DBの変更はSupabase SQL Editorで手動実行
```
