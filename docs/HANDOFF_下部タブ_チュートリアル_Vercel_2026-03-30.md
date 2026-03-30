# 引き継ぎ：下部タブ帯・チュートリアル・本番反映（2026-03-30）

**リポジトリ**: [github.com/minougun/maguromaru-note](https://github.com/minougun/maguromaru-note)  
**ローカル**: `/mnt/c/Users/minou/maguromaru-note`  
**本番**: [maguromaru-note.vercel.app](https://maguromaru-note.vercel.app)（`master` の Git 連携デプロイ想定）

---

## 1. 何をしたか（要約）

- **下部タブ帯**は **各タブセル内のラベル**（実機は `TabBar` の各 `Link` 内、モックは `OnboardingDeviceMock` の各セル内）。二層重ねない（背面ラベル＋透明リンクは環境・色継承で見えなくなることがある）。SVG は廃止。選択表示は CSS グロー。絵文字タブは廃止。
- **寸法**: 帯は **430×84** 前後（`aspect-ratio: 430 / 84`、絵文字＋ラベル用。アプリ `max-width: 430px` と論理幅を揃える）。
- **実機 `TabBar`**: セーフエリアは外枠 `nav.tab-bar` の `padding-bottom` のみ。`tab-bar-strip` は **6 列 1 層グリッド**で各セルが `Link`。ラベルは `tab-link-label`（`z-index:2`）、選択グローは `::before`（`z-index:1`）。`nav.tab-bar` に `color: #b9cae0` を指定し `a` の inherit 問題を避ける。
- **選択表示**: `data-active` ではなく **`aria-current="page"`** の **`::before`** でセル全体に柔らかい水色のグロー（ドットは廃止）。`[data-active="true"]` は React の DOM 表現差で外れることがあるため使わない。
- **チュートリアル用モック**（`OnboardingDeviceMock`）: `onboarding-mock-tabbar` も **6 列 1 層**で各セルに `onboarding-mock-tab-label`。選択は **`onboarding-mock-tab--active`** ＋グロー。
- **`OnboardingTutorial`**: 各ステップの **`screenshotSrc`（WebP）を削除**済み。常に `OnboardingDeviceMock` を表示（旧スクショに焼き込まれたタブだと「変更が反映されない」ように見えていた）。
- **オンボーディング完了キー**: `src/lib/onboarding-storage.ts` の **`maguro_note_onboarding_v5_done`**（内容更新のたびにキー名を上げる方針。`v4` 完了済みユーザーは v5 でチュートリアル再表示）。

---

## 2. 主要ファイル（絶対パス）

| 内容 | パス |
|------|------|
| タブ定義（順序・ラベル） | `/mnt/c/Users/minou/maguromaru-note/src/lib/main-tabs.ts` |
| 実機タブ | `/mnt/c/Users/minou/maguromaru-note/src/components/ui/TabBar.tsx` |
| チュートリアルステップ定義 | `/mnt/c/Users/minou/maguromaru-note/src/components/onboarding/OnboardingTutorial.tsx` |
| デバイスモック | `/mnt/c/Users/minou/maguromaru-note/src/components/onboarding/OnboardingDeviceMock.tsx` |
| 共通スタイル（`.tab-bar-*` / `.onboarding-mock-tabbar*` 等） | `/mnt/c/Users/minou/maguromaru-note/src/app/globals.css` |
| チュートリアル完了フラグ | `/mnt/c/Users/minou/maguromaru-note/src/lib/onboarding-storage.ts` |
| シェル（タブ＋オンボーディング表示条件） | `/mnt/c/Users/minou/maguromaru-note/src/components/layout/AppShell.tsx` |

---

## 3. 本番で「反映されない」と言われたときの切り分け

### 3.1 よくある誤解

- **チュートリアル完了済み**だと `OnboardingDeviceMock` は出ない。見ているのが **実機 `TabBar` だけ**の可能性。
- **1 枚目イントロ**は `activeHref === null` のため **下部タブにドットは出ない**（2 枚目「ホーム」以降で選択ドットを確認）。

### 3.2 Local Storage（チュートリアル再表示）

- **キー**: `maguro_note_onboarding_v5_done` が `"1"` なら完了扱い。
- **Firefox**: 開発者ツールの **「Storage」** タブ → 左の **Local Storage** → オリジン選択。  
  **Chrome / Edge**: **「Application」** → **Local Storage**。
- 空表示でも、未完了ならキー自体が無いだけ、ということはある。

### 3.3 Vercel が古いビルドのまま（実際に起きた）

- 症状: ユーザーは最新を push しているのに、本番の見た目が古い。
- **検証手順**（ローカルで可）:
  1. `npm run build` 後、`.next/static/chunks/*.css` に **`tab-bar-strip-bg`** 等の新クラスがあるか `grep`。
  2. `curl -sS "https://maguromaru-note.vercel.app/"` で HTML 内の `/_next/static/chunks/XXXX.css` を確認。
  3. その CSS を `curl` して **`tab-bar-strip-bg`** や **`aspect-ratio:430/75`**（旧 `643/112` でないこと）を確認。
- **対処**: Vercel ダッシュボードで **Deployments** の成否・**Production ブランチ**（`master`）を確認。必要なら **`git commit --allow-empty -m "chore: redeploy"`** で再デプロイをトリガーした（2026-03-30 時点でこれで本番 CSS ハッシュがローカルビルドと一致した）。
- 静的アセットは **`Cache-Control: immutable`** になりがちなので、**新しいデプロイの HTML** が新しいチャンク名を指していることが重要（古い HTML をキャッシュしていると旧 CSS を読み続ける）。

---

## 4. ビルド・デプロイ運用（リポジトリ方針）

- 変更後は **`git push origin master`**。可能なら完了前に push（ユーザールール / `AGENTS.md`）。
- `vercel.json`: `/mnt/c/Users/minou/maguromaru-note/vercel.json`（関数 `maxDuration` のみ。デプロイブランチはダッシュボード設定依存）。

---

## 5. 旧ドキュメントとの食い違い

- `docs/HANDOFF_作業引き継ぎ_2026-03-30.md` のオンボーディング節には **「絵文字タブ」** の記述が残っている可能性がある。現状は **PNG 帯＋二層レイアウト**が正。必要なら当該節を本ファイルに合わせて更新すること。

---

## 6. 任意のフォローアップ（未着手）

- `@2x` 用のタブ帯画像と `srcset`（Retina でよりシャープにしたい場合）。
- イントロ 1 枚目でも「例として」ホームにドットを付けるかどうか（現状は付けない）。

---

## 7. 参照 URL・パス一覧（コピー用）

- Web 本番: `https://maguromaru-note.vercel.app`
- Web リポジトリ: `https://github.com/minougun/maguromaru-note`
- 本引き継ぎ: `/mnt/c/Users/minou/maguromaru-note/docs/HANDOFF_下部タブ_チュートリアル_Vercel_2026-03-30.md`
