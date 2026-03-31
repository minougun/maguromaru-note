# まぐろ丸ノート 引き継ぎメモ（2026-03-31）

## プロジェクト情報
- 実装リポジトリ: `/mnt/c/Users/minou/maguromaru-note`
- 公開 URL: `https://maguromaru-note.vercel.app`
- 技術スタック: Next.js 16.1.6 (App Router, Turbopack) / React 19 / TypeScript / Tailwind 4 / Supabase / Vercel
- 前回の引き継ぎ: `/mnt/c/Users/minou/maguromaru-note/AGENT_HANDOFF_2026-03-29_RESTART.md`

## 今回のセッションで実施した作業

### 1. トップ画面 GIF 差し替え + フェードイン演出（完了・デプロイ済み）
- `C:\Users\minou\Downloads\maru\enso_animation_freeze.gif` を `/mnt/c/Users/minou/maguromaru-note/public/brand/login-launch-mark.gif` に配置
- GIF の NETSCAPE2.0 ループ拡張を除去し、1回再生で最終フレームに停止するよう加工済み
- GIF アニメ完了（5秒）後にタイトルバー（AppHeader）と「今すぐはじめる」「サインイン」ボタンがフェードインする演出を追加
- 変更ファイル:
  - `/mnt/c/Users/minou/maguromaru-note/public/brand/login-launch-mark.gif` — GIF 差し替え + ループ除去
  - `/mnt/c/Users/minou/maguromaru-note/src/components/layout/AppShell.tsx` — `LoginShell` コンポーネント分離、ヘッダーのフェードイン制御
  - `/mnt/c/Users/minou/maguromaru-note/src/components/screens/LoginScreen.tsx` — `onAnimationEnd` / `revealed` props 追加、5秒タイマー
  - `/mnt/c/Users/minou/maguromaru-note/src/app/globals.css` — `.login-reveal` / `.login-reveal--visible` 追加（opacity + translateY 0.8s ease）

### 2. タブバーアイコンを絵文字から SVG に変更（デプロイ済みだが本番に反映されない問題あり）
- 絵文字（🏠✏️📖🐟🏅👤）を塗りつぶしベースの SVG アイコンに変更
- 変更ファイル:
  - `/mnt/c/Users/minou/maguromaru-note/src/components/ui/TabIcon.tsx` — **新規作成**。6種の fill ベース SVG アイコン（home, record, zukan, quiz, titles, mypage）
  - `/mnt/c/Users/minou/maguromaru-note/src/components/ui/TabBar.tsx` — 絵文字 → `TabIcon` コンポーネントに変更
  - `/mnt/c/Users/minou/maguromaru-note/src/lib/main-tabs.ts` — `icon` フィールド追加（`emoji` もフォールバック用に残存）
  - `/mnt/c/Users/minou/maguromaru-note/src/app/globals.css` — `.tab-link-emoji` → `.tab-link-icon` に変更、選択時の色・グロー追加

## 未解決の問題: Vercel デプロイが本番に反映されない

### 症状
- `npx vercel --prod --force` でビルド成功、`Aliased: https://maguromaru-note.vercel.app` 表示あり
- `curl` でJSバンドルを確認すると新しいSVGアイコンコード（`c8875a`, `tab-link-icon`, `viewBox`）が含まれている
- しかしブラウザ（通常モード・プライベートモード両方）では旧デザイン（絵文字）のまま表示される

### 試したこと
1. `npx vercel --prod` — preview デプロイになった
2. `npx vercel deploy --prod` — デプロイされるが反映されず
3. `npx vercel --prod --force` — Vercel サーバー上でビルド、Aliased 表示あり → 反映されず
4. `npx vercel promote <url>` — 「already production」エラー
5. `.next` と `.vercel/output` 削除後のクリーンビルド → 変わらず
6. ブラウザのプライベートモード → 変わらず

### 疑わしい原因
- Vercel のエッジキャッシュ / CDN キャッシュが古いバージョンを配信し続けている可能性
- ローカルビルド (`npx vercel --prod`) と Vercel サーバービルド (`--force`) でチャンク名が異なり、HTML が古いチャンクを参照している可能性
- Vercel Deployment Protection の設定が関与している可能性

### 確認すべきこと
1. Vercel ダッシュボード（https://vercel.com/minouguns-projects/maguromaru-note）で最新デプロイが production に紐づいているか
2. ダッシュボードから手動で Redeploy を試す
3. Vercel の Settings → Deployment Protection が Standard Protection になっていないか確認
4. `vercel env pull` で環境変数の同期状態を確認

## ユーザーの要望（次のエージェントへ）
- **タブバーのアイコン**: 絵文字からSVGアイコンへの変更は実装済み。本番反映の問題を解決すれば完了
- **タブバーの全体デザイン**: ユーザーは「前のデザインに戻して」と言っている。参考画像: `C:\Users\minou\OneDrive\ドキュメント\655638.jpg`（濃紺背景・カラフルな塗りアイコン・選択タブに青グロー+上部ドット）。CSS のグロー+ドット演出は維持されているが、アイコンが反映されないため確認できていない
- **GIF フェードイン演出**: 完了済み。GIF 1回再生 → 5秒後にヘッダー+ボタンがフェードイン

## 未コミットの変更一覧
```
 M public/brand/login-launch-mark.gif
 M src/app/globals.css
 M src/components/layout/AppShell.tsx
 M src/components/screens/LoginScreen.tsx
 M src/components/ui/TabBar.tsx
 M src/lib/main-tabs.ts
?? src/components/ui/TabIcon.tsx  (新規)
```

## ローカル検証コマンド
```bash
cd /mnt/c/Users/minou/maguromaru-note
npm run typecheck   # 通過済み
npm run build       # 通過済み
npx vercel --prod --force  # Vercel サーバービルド
```

## デプロイ
- コマンド: `npx vercel --prod` または Vercel ダッシュボードから手動
- 変更後は必ずデプロイすること（ユーザー明示指示）
- フロー: `npm run typecheck` → `npm run build` → `git commit` → デプロイ

## オンボーディングモックについて
- `/mnt/c/Users/minou/maguromaru-note/src/components/onboarding/OnboardingDeviceMock.tsx` ではまだ `tab.emoji` を使用
- タブバー本体とは独立したモックなので、必要に応じて別途 TabIcon 対応が必要
