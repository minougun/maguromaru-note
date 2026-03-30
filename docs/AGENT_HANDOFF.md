# エージェント引き継ぎメモ（経緯・経過）

**対象リポジトリ（ローカル）**: `/mnt/c/Users/minou/maguromaru-note`  
**リモート**: https://github.com/minougun/maguromaru-note  

このファイルは、これまでの会話ベースの作業内容を後続の人間／エージェントが追えるようにまとめたものです。コミットハッシュは当時の `master` を指します（必要なら `git log` で確認してください）。

---

## 1. 匿名ユーザー → Google/Apple/メール連携時のデータ移行（コールバック統合）

### 背景・課題

- 従来、`prepare` で発行した **nonce を `sessionStorage` に保存**し、OAuth 復帰後に **マイページで `complete` API をクライアントから呼ぶ**構成だった。
- これにより **nonce 喪失・別タブ・セッション確立タイミング**で移行されないまま成功表示になり得る、などの弱点があった。

### 実装方針（採用済み）

1. **HttpOnly Cookie**（`src/lib/anonymous-link-cookie.ts`）に nonce を保存。`prepare` の JSON では nonce を返さない（`{ ok: true }` のみ）。
2. **`GET /auth/callback`**（`src/app/auth/callback/route.ts`）で Cookie から nonce を読み、`exchangeCodeForSession` / `verifyOtp` の戻り **`session`** を使って、可能なら **`completeAnonymousLinkMigration`** をサーバー側で実行。
3. **全リダイレクト応答で nonce Cookie を削除**。移行失敗時はクエリに `anon_link_warn=migration_failed` を付与。
4. **クライアント**（`src/lib/supabase/browser.ts`）は `prepare` を `credentials: "include"` で呼び、OAuth 前の sessionStorage nonce は廃止。
5. **匿名ユーザーのメール連携**でも `requestEmailLinkConfirmation` 前に `prepare` を呼び、メール確認リンク戻りでも nonce が載るようにした。
6. **`POST .../complete`** は後方互換・手動用に残置。
7. UI: `MyPageScreen` からクライアント `complete` を削除。`readLinkedFlowMessages` / `anon_link_warn` で通知（`src/lib/auth-callback-ui.ts` 等）。

### 関連ファイル（目安）

- `src/lib/anonymous-link-cookie.ts`
- `src/app/api/auth/anonymous-link/prepare/route.ts`
- `src/app/auth/callback/route.ts`
- `src/lib/services/anonymous-link-service.ts`（ロジック本体・変更は主に呼び出し元）
- `src/lib/supabase/browser.ts`
- `src/components/screens/MyPageScreen.tsx`
- `src/lib/auth-callback-ui.ts`

### 意図的に未着手（中長期）

- DB トランザクション化、写真コピー失敗時の扱い、nonce のさらなる冪等化などはスコープ外として残している可能性あり。

---

## 2. クイズ画面の文言・レイアウト

### 変更内容

- ヘッダー統計の **「累計正解」「最高到達」** を削除（`src/components/screens/QuizScreen.tsx`）。
- 説明文を **「各ステージ内で累計 10問正解すると次のステージが解放」** に短縮。
- 上記説明文を **中央寄せ**（`globals.css` の `.quiz-unlock-hint`）。

---

## 3. 初回オンボーディング（チュートリアル）

### 変更内容

- 旧 **`public/onboarding/mock-*.svg`** は削除。
- **実 UI に寄せた CSS モック** `OnboardingDeviceMock`（`src/components/onboarding/OnboardingDeviceMock.tsx`）を追加。ヘッダー・暖簾・カード・**下部タブは `bottom-tabs.svg`（430×75、中立トーン）ベースの二層レイアウト**で実機 `TabBar` と整合（絵文字 6 タブ表現は廃止）。
- `OnboardingTutorial` は **常にモック表示**。各ステップの **`screenshotSrc`（WebP）は削除済み**（静的スクショに焼き込まれたタブと実機の見た目差を防ぐ）。
- チュートリアル再表示用に **`onboarding-storage.ts` のキーを v5**（`maguro_note_onboarding_v5_done`）へ更新（内容差し替えのたびにキーを上げる方針）。

### 関連ファイル

- `src/components/onboarding/OnboardingTutorial.tsx`
- `src/components/onboarding/OnboardingDeviceMock.tsx`
- `src/lib/onboarding-storage.ts`
- `src/app/globals.css`（`.onboarding-device` 以下の大量スタイル）
- `src/components/screens/HomeScreen.tsx`（認証クエリ掃除を `clearAuthCallbackQueryParams` に統一した流れ）

---

## 4. Google アカウント連携後の UI 崩れ対策

### 想定原因と対応

1. **`getUserIdentities()`** が OAuth 直後に空／エラーになり、**例外またはプロバイダ一覧が空** → 表示や状態がおかしく見える。  
   → **`getUser().user.identities` にフォールバック**し、`identitiesError` では throw しない（`src/lib/supabase/browser.ts` の `getSupabaseAuthProfile`）。
2. プロフィール取得失敗時に、リスト内が **「読み込み中」のまま**に見える。  
   → `AccountLinkSection` でローディング／エラー／一覧を分岐（`src/components/mypage/AccountLinkSection.tsx`）。
3. マイページの `loadProfile` が **`accessToken` 依存だけ**だと取りこぼしうる。  
   → **`auth.signedIn` をトリガに変更**（`MyPageScreen.tsx`）。
4. 下部タブ **「アカウント連携」** が 6 列で折り返し過多 → 高さ・はみ出し。  
   → ラベルを **「マイページ」** に変更（`TabBar.tsx`、オンボーディングモックのタブ表記も合わせて更新）。画面上部の暖簾文言「アカウント連携」は維持。
5. 横スクロール・フレックスの **`min-width: auto` 問題**など。  
   → `globals.css` で `overflow-x: clip`、`tab-link` / `account-link-row` 周りの `min-width: 0`・折り返し・アイコン `overflow` 調整。

---

## 5. 検証コマンド（ローカル）

```bash
cd /mnt/c/Users/minou/maguromaru-note
npm run build
npm test
```

---

## 6. 引き継ぎ時のチェックリスト

- [ ] `master` がリモートと一致しているか（`git pull` / `git log`）
- [ ] 匿名 → Google/Apple/メール の **実機またはステージング**でコールバック後のデータ移行・`anon_link_warn` 表示
- [ ] マイページで **連携済み表示**が期待どおりか（特に Google 直後）
- [ ] 初回オンボーディング（v3 キーで再表示されるか／画像差し替え時は `screenshotSrc` と `public` 配置）
- [ ] ユーザールール・`AGENTS.md`（ワークスペースルール）の遵守方針

---

## 7. 参考: 作業中に触れた主なコミット（例）

履歴は `git log --oneline -15` で確認してください。会話上では概ね次のような並びでした。

- 匿名連携のコールバック統合・Cookie 化
- クイズ画面の統計削除・文言短縮
- オンボーディング実 UI モック・クイズ説明中央寄せ・onboarding v3
- Google 連携後 UI 安定化（identities フォールバック・タブ短縮・CSS）

---

*最終更新: 引き継ぎドキュメント作成時点（リポジトリ `docs/AGENT_HANDOFF.md`）*
