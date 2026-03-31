# 作業引き継ぎメモ（2026-03-31 session3）

**リポジトリ**: `/mnt/c/Users/minou/maguromaru-note`
**本番**: https://maguromaru-note.vercel.app
**ローカル開発**: `http://localhost:3000`（`npm run dev`）
**前回の引き継ぎ**: `docs/HANDOFF_作業引き継ぎ_2026-03-31_session2.md`

---

## 本セッションの経緯と最終状態

### 背景
- session2 で部位マップの配色・クリップパス・ダークテーマ枠などを大量にいじった結果、元に戻せなくなった
- 原因: ユーザーが目標としていたスクリーンショット `164153.png` は **本番（`e1c504d`）をブラウザのダークモードで** 撮影したものだった
- しかし session2 では `e878f7f`（ローカル最新コミット）の状態を復元しようとしていたため、色もマップ構造も全く違うコードを基準にしていた
- `e1c504d` と `e878f7f` は TunaMap.tsx・part-brand-colors.ts・globals.css が根本的に異なる（オーバーレイ方式、色定数、CSS構造すべて）

### 解決策
- TunaMap.tsx・ZukanScreen.tsx・globals.css を **`e1c504d`（本番デプロイ済みコミット）** から復元
- part-brand-colors.ts は `e1c504d` の内容＋後続コミットとの互換エクスポートを追加（`PART_DISPLAY_SWATCHES`, `applyPartDisplayColors`, `mapDisplayColorForPart`）
- これにより `164153.png` の状態を完全再現できた

### 大トロ・中トロ色入れ替え
- `part-brand-colors.ts` の定数を入れ替えたが、**APIレスポンス経由の `parts.color` が優先**されるため反映されなかった
- 対策: `TunaMap.tsx` 内に `FORCE_COLORS` マップを追加し、コンポーネント内で直接色を上書き
- **注意**: TunaMap 以外の画面（図鑑一覧カード、記録画面など）にも色を反映するには、`app-service.ts` の `applyPartDisplayColors` が実際に効いているか要確認

---

## 未コミットの変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `src/components/TunaMap.tsx` | `e1c504d` ベースに復元 + `FORCE_COLORS` で大トロ・中トロ色を強制上書き |
| `src/lib/domain/part-brand-colors.ts` | `e1c504d` ベース + 互換エクスポート追加 + 色入れ替え |
| `src/components/screens/ZukanScreen.tsx` | `e1c504d` に復元 |
| `src/app/globals.css` | `e1c504d` に復元 |
| `next-env.d.ts` | Next.js 自動生成（差分無視可） |

**HEAD**: `e878f7f revert: restore zukan-map-reference-block styling to match 160835 screenshot`

---

## 現在の配色（入れ替え後）

| 部位 | 元の色 | 入れ替え後 |
|------|--------|-----------|
| 大トロ (otoro) | `#eb7e7c` | `#d66078` |
| 中トロ (chutoro) | `#d66078` | `#eb7e7c` |

### 色が反映される場所と方法

| 場所 | 反映方法 | 状態 |
|------|----------|------|
| TunaMap（部位マップ） | `FORCE_COLORS` で直接上書き | 反映済み |
| 図鑑一覧カード | `applyPartDisplayColors` 経由 | 要確認 |
| 記録画面 | `mapDisplayColorForPart` 経由 | 要確認 |
| Supabase DB `parts.color` | マイグレーション | 未対応 |

---

## 重要な教訓

### 1. 本番 vs ローカルの状態の乖離
- 本番は `e1c504d` で止まっている（Vercel 無料プラン 100 deploys/日 上限）
- ローカルは `e878f7f`（30コミット以上先）で、TunaMap の実装が根本的に異なる
  - `e1c504d`: stroke 描画、tintオーバーレイなし、楕円ベース
  - `e878f7f`: clipPath + reveal画像 + mapOverlayTintHex、polygon ベース
- **ユーザーのスクショがどの環境で撮られたかを最初に確認すべきだった**

### 2. 色変更が反映されない原因
- `part-brand-colors.ts` の定数を変えても、Supabase から取得した `parts.color` が API レスポンスに含まれる
- `applyPartDisplayColors` で上書きしているはずだが、DBの色とスウォッチの両方が存在する場合の優先順位を要確認
- 確実に反映するには TunaMap 内の `FORCE_COLORS` のようにコンポーネント内で直接上書きが最も信頼性が高い

### 3. `.map-wrap` CSS の影響
- `e1c504d` の `.map-wrap`: `border: 1px solid var(--wood-mid)`, `background: linear-gradient(...)`, 薄い影
- `e878f7f` の `.zukan-map-reference-block .map-wrap`: `border: none`, `background: #ffffff`, 深い影
- ダークモードではブラウザの自動変換が CSS 変数やグラデーションに影響し、見え方が大きく変わる

---

## Vercel デプロイ上限問題（継続）

- 無料プランの **1日100デプロイ上限** に到達済み
- 24時間後に上限リセット → 自動デプロイされるはず
- Deploy Hook URL: `https://api.vercel.com/v1/integrations/deploy/prj_WcIXp5GaCrUqsN1Yh2qD5pxRwUmr/wEV1cuAk8L`
- リセット後にデプロイされない場合は `curl -X POST <上記URL>` で手動トリガー

---

## 主要ファイルの現状

| 内容 | パス | 状態 |
|------|------|------|
| 部位マップ | `src/components/TunaMap.tsx` | e1c504d + FORCE_COLORS |
| 配色定数 | `src/lib/domain/part-brand-colors.ts` | e1c504d + 互換 + 入替 |
| 図鑑画面 | `src/components/screens/ZukanScreen.tsx` | e1c504d |
| CSS | `src/app/globals.css` | e1c504d |
| マップオーバーレイ色 | `src/lib/map-overlay-tint.ts` | e878f7f（TunaMapから未使用） |
| データ取得 | `src/lib/services/app-service.ts` | e878f7f |
| スナップショット | `src/components/providers/AppSnapshotProvider.tsx` | e878f7f |

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

1. **大トロ・中トロ色入れ替えの全画面反映確認** — TunaMap 以外（図鑑一覧、記録画面）でも色が変わっているか確認
2. **コミット & プッシュ** — 未コミットの変更をまとめてコミット
3. **デプロイ上限リセット後の本番反映** — 上限リセット後にpush or deploy hook
4. **`FORCE_COLORS` の恒久化** — DB マイグレーションで `parts.color` を更新すれば `FORCE_COLORS` は不要になる
5. **不要ファイルの整理** — `src/lib/map-overlay-tint.ts` は現在の TunaMap から未使用

---

## 他エージェント向け依頼文例

```text
まず /mnt/c/Users/minou/maguromaru-note/docs/HANDOFF_作業引き継ぎ_2026-03-31_session3.md を読んでください。

公開先は https://maguromaru-note.vercel.app、
ローカルは /mnt/c/Users/minou/maguromaru-note です。

重要: 現在のローカルには未コミットの変更があります。
TunaMap.tsx・part-brand-colors.ts・ZukanScreen.tsx・globals.css を
本番デプロイ済みコミット e1c504d ベースに復元し、大トロ・中トロの色入れ替えを適用しています。

Vercel の1日デプロイ上限（100回）に達しているため、本番反映は上限リセット後になります。
ローカルでの確認は npm run dev → http://localhost:3000 で可能です。
```
