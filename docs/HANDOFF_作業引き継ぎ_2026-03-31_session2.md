# 作業引き継ぎメモ（2026-03-31 session2）

**リポジトリ**: `/mnt/c/Users/minou/maguromaru-note`
**本番**: https://maguromaru-note.vercel.app
**ローカル開発**: `http://localhost:3000`（`npm run dev`）
**前回の引き継ぎ**: `docs/HANDOFF_作業引き継ぎ_2026-03-31.md`

---

## 本セッションで実施した作業

### 1. トップ画面 GIF 差し替え + フェードイン演出
- `C:\Users\minou\Downloads\maru\enso_animation_freeze.gif` を `/public/brand/login-launch-mark.gif` に配置
- GIF の NETSCAPE2.0 ループ拡張を除去（1回再生で最終フレームに停止）
- GIF アニメ完了（5秒）後にタイトルバー（AppHeader）と「今すぐはじめる」「サインイン」ボタンがフェードインする演出を追加
- **変更ファイル**:
  - `public/brand/login-launch-mark.gif`
  - `src/components/layout/AppShell.tsx` — `LoginShell` コンポーネント分離、ヘッダーのフェードイン制御
  - `src/components/screens/LoginScreen.tsx` — `onAnimationEnd` / `revealed` props、5秒タイマー
  - `src/app/globals.css` — `.login-reveal` / `.login-reveal--visible`（opacity + translateY 0.8s ease）

### 2. タブバーアイコンを絵文字から SVG に変更
- 絵文字を線画ベースの SVG アイコンに変更（別エージェントが塗りから線画に再修正済み）
- **変更ファイル**:
  - `src/components/ui/TabIcon.tsx` — 新規作成。stroke ベースの SVG アイコン 6→5 種（mypage タブは別エージェントが削除済み）
  - `src/components/ui/TabBar.tsx` — 絵文字 → `TabIcon` コンポーネント
  - `src/lib/main-tabs.ts` — `icon` フィールド追加、`emoji` もフォールバック用に残存

### 3. 大トロ・中トロの色入れ替え
- `src/lib/domain/part-brand-colors.ts` の定数を入れ替え:
  - 大とろ: `#eb7e7c` → `#d66078`
  - 中とろ: `#d66078` → `#eb7e7c`
- コミット: `0cd7c7b`

### 4. 図鑑マップに色オーバーレイ追加
- `src/components/TunaMap.tsx` — reveal 画像（焼き付け色）の上に `primary.color` で `opacity="0.45"` の半透明 rect をクリップ内に追加
- これにより `part-brand-colors.ts` の色がマップ上の魚体の塗りにも反映される
- コミット: `6833743`

### 5. タブバーのデザイン調整
- タブバー背景色: `#1b2d4f` → `var(--navy)` でヘッダーと統一
- 選択タブの上部ドット: `box-shadow` の縁取り（◎に見えていた）を全除去 → シンプルな白い点
- ダークモード用の `@media (prefers-color-scheme: dark)` のドットスタイルも削除
- コミット: `a1744aa`

---

## Vercel デプロイ上限問題（重要）

### 状況
- 無料プランの **1日100デプロイ上限** に到達
- CLI (`npx vercel --prod`)、Git push 自動デプロイ、Deploy Hook、ダッシュボード Redeploy の**全てがブロック**
- 本番は `e1c504d` で止まっており、以降のコミット（`6833743`, `0cd7c7b`, `5bd3e82`, `a1744aa`）は未デプロイ

### 対応
- 24時間後に上限リセット → 自動デプロイされるはず
- Deploy Hook URL（手動トリガー用）: `https://api.vercel.com/v1/integrations/deploy/prj_WcIXp5GaCrUqsN1Yh2qD5pxRwUmr/wEV1cuAk8L`
- リセット後にデプロイされない場合は `curl -X POST <上記URL>` で手動トリガー

---

## 未デプロイのコミット一覧（本番反映待ち）

```
a1744aa style: tab bar background to match header, simplify active dot
5bd3e82 chore: trigger deploy for latest changes
0cd7c7b fix: swap otoro/chutoro display colors
6833743 fix: overlay part color on tuna map reveal for otoro/chutoro sync
645dda4 docs: fix mockup path extension in handoff
7209f7e docs: add handoff memo for 2026-03-31
```

---

## 主要ファイルの現状

| 内容 | パス |
|------|------|
| トップ画面（ログイン） | `src/components/screens/LoginScreen.tsx` |
| ログインシェル（フェードイン制御） | `src/components/layout/AppShell.tsx` |
| GIF ロゴ | `public/brand/login-launch-mark.gif` |
| タブバー | `src/components/ui/TabBar.tsx` |
| タブアイコン SVG | `src/components/ui/TabIcon.tsx` |
| タブ定義 | `src/lib/main-tabs.ts` |
| 大トロ・中トロの色定数 | `src/lib/domain/part-brand-colors.ts` |
| 図鑑マップ（色オーバーレイ） | `src/components/TunaMap.tsx` |
| CSS（全般） | `src/app/globals.css` |

---

## ローカル検証コマンド

```bash
cd /mnt/c/Users/minou/maguromaru-note
npm run dev          # ローカル開発サーバー (http://localhost:3000)
npm run typecheck    # TypeScript 型チェック
npm run build        # Next.js ビルド
```

---

## 次に触るかもしれない作業

- **デプロイ上限リセット後の本番反映確認**（最優先）
- **オーバーレイの opacity 調整**: 現在 0.45。色の見え方次第で調整
- **オンボーディングモック**: `src/components/onboarding/OnboardingDeviceMock.tsx` ではまだ `tab.emoji` を使用。TabIcon 対応は未実施
- **マップ reveal 画像の色**: オーバーレイで上書きしているが、元画像の色と混ざるため完全一致にはならない。気になる場合は reveal 画像自体の差し替えが必要

---

## 他エージェント向け依頼文例

```text
まず /mnt/c/Users/minou/maguromaru-note/docs/HANDOFF_作業引き継ぎ_2026-03-31_session2.md を読んでください。

公開先は https://maguromaru-note.vercel.app、
ローカルは /mnt/c/Users/minou/maguromaru-note です。

Vercel の1日デプロイ上限（100回）に達しているため、本番反映は上限リセット後になります。
ローカルでの確認は npm run dev → http://localhost:3000 で可能です。
```
