import assert from "node:assert/strict";
import test from "node:test";

import {
  anonymousLinkCompleteBodySchema,
  authNextPathSchema,
  claimShareBonusInputSchema,
  checkQuizAnswerInputSchema,
  createQuizSessionInputSchema,
  createEmailAccountInputSchema,
  displayNameOnlySchema,
  recordVisitInputSchema,
  signInWithPasswordInputSchema,
  submitQuizSessionInputSchema,
  updateStoreStatusInputSchema,
} from "@/lib/domain/schemas";

test("recordVisitInputSchema rejects invalid part enum values", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        menuItemId: "maguro_don",
        visitedAt: "2026-03-28",
        partIds: ["invalid_part"],
      }),
    /Invalid option/,
  );
});

test("recordVisitInputSchema requires menuItemId", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        visitedAt: "2026-03-28",
        partIds: ["akami"],
      }),
    /Invalid option/,
  );
});

test("recordVisitInputSchema rejects extra keys", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        menuItemId: "maguro_don",
        visitedAt: "2026-03-28",
        partIds: ["akami"],
        role: "admin",
      }),
    /Unrecognized key/,
  );
});

test("recordVisitInputSchema rejects duplicate parts", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        menuItemId: "maguro_don",
        visitedAt: "2026-03-28",
        partIds: ["akami", "akami"],
      }),
    /重複/,
  );
});

test("recordVisitInputSchema rejects invalid subjective enum values", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        menuItemId: "maguro_don",
        visitedAt: "2026-03-28",
        partIds: ["akami"],
        partTastings: [
          {
            partId: "akami",
            fatLevel: "too_much",
            textureLevel: "firm",
            satisfaction: 4,
            wantAgain: true,
          },
        ],
      }),
    /Invalid option/,
  );
});

test("recordVisitInputSchema rejects subjective entries for unselected parts", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        menuItemId: "maguro_don",
        visitedAt: "2026-03-28",
        partIds: ["akami"],
        partTastings: [
          {
            partId: "otoro",
            fatLevel: "rich",
            textureLevel: "melty",
            satisfaction: 5,
            wantAgain: true,
          },
        ],
      }),
    /選択していない部位/,
  );
});

test("recordVisitInputSchema rejects duplicate subjective entries", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        menuItemId: "maguro_don",
        visitedAt: "2026-03-28",
        partIds: ["akami"],
        partTastings: [
          {
            partId: "akami",
            fatLevel: "light",
            textureLevel: "firm",
            satisfaction: 4,
            wantAgain: true,
          },
          {
            partId: "akami",
            fatLevel: "balanced",
            textureLevel: "smooth",
            satisfaction: 5,
            wantAgain: true,
          },
        ],
      }),
    /重複/,
  );
});

test("recordVisitInputSchema rejects invalid calendar dates", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        menuItemId: "maguro_don",
        visitedAt: "2026-02-31",
        partIds: ["akami"],
      }),
    /来店日の形式が不正です/,
  );
});

test("recordVisitInputSchema rejects unsupported photo mime types", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        menuItemId: "maguro_don",
        visitedAt: "2026-03-28",
        partIds: ["akami"],
        photoDataUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
      }),
    /JPEG \/ PNG \/ WebP/,
  );
});

test("recordVisitInputSchema rejects oversized photo payloads", () => {
  assert.throws(
    () =>
      recordVisitInputSchema.parse({
        menuItemId: "maguro_don",
        visitedAt: "2026-03-28",
        partIds: ["akami"],
        photoDataUrl: `data:image/jpeg;base64,${"A".repeat(6_000_001)}`,
      }),
    /画像データが大きすぎます/,
  );
});

test("createQuizSessionInputSchema rejects invalid stage number", () => {
  assert.throws(
    () =>
      createQuizSessionInputSchema.parse({
        stageNumber: 101,
      }),
    /Too big/,
  );
});

test("submitQuizSessionInputSchema rejects invalid answer index", () => {
  assert.throws(
    () =>
      submitQuizSessionInputSchema.parse({
        sessionId: "10000000-0000-4000-8000-000000000001",
        answers: [[0], [1], [4]],
      }),
    /Too big/,
  );
});

test("submitQuizSessionInputSchema rejects empty answers", () => {
  assert.throws(
    () =>
      submitQuizSessionInputSchema.parse({
        sessionId: "10000000-0000-4000-8000-000000000001",
        answers: [],
      }),
    /回答が空です/,
  );
});

test("checkQuizAnswerInputSchema rejects invalid answer index", () => {
  assert.throws(
    () =>
      checkQuizAnswerInputSchema.parse({
        sessionId: "10000000-0000-4000-8000-000000000001",
        questionId: "part-area-akami",
        answerIndexes: [9],
      }),
    /Too big/,
  );
});

test("checkQuizAnswerInputSchema rejects extra keys", () => {
  assert.throws(
    () =>
      checkQuizAnswerInputSchema.parse({
        sessionId: "10000000-0000-4000-8000-000000000001",
        questionId: "part-area-akami",
        answerIndexes: [1],
        leaked: true,
      }),
    /Unrecognized key/,
  );
});

test("checkQuizAnswerInputSchema accepts answerProof when provided", () => {
  const parsed = checkQuizAnswerInputSchema.parse({
    sessionId: "10000000-0000-4000-8000-000000000001",
    questionId: "part-area-akami",
    answerIndexes: [1],
    answerProof: "proof-token",
  });

  assert.equal(parsed.answerProof, "proof-token");
});

test("claimShareBonusInputSchema rejects invalid target type", () => {
  assert.throws(
    () =>
      claimShareBonusInputSchema.parse({
        targetType: "zukan",
        targetId: "10000000-0000-4000-8000-000000000001",
        channel: "x",
      }),
    /Invalid option/,
  );
});

test("claimShareBonusInputSchema rejects extra keys", () => {
  assert.throws(
    () =>
      claimShareBonusInputSchema.parse({
        targetType: "visit_log",
        targetId: "10000000-0000-4000-8000-000000000001",
        channel: "x",
        extra: true,
      }),
    /Unrecognized key/,
  );
});

test("createEmailAccountInputSchema rejects invalid email", () => {
  assert.throws(
    () =>
      createEmailAccountInputSchema.parse({
        email: "not-an-email",
        password: "password123",
        passwordConfirmation: "password123",
      }),
    /メールアドレスの形式が不正です/,
  );
});

test("createEmailAccountInputSchema rejects password mismatch", () => {
  assert.throws(
    () =>
      createEmailAccountInputSchema.parse({
        email: "user@example.com",
        password: "password123",
        passwordConfirmation: "password456",
      }),
    /一致しません/,
  );
});

test("createEmailAccountInputSchema rejects extra keys", () => {
  assert.throws(
    () =>
      createEmailAccountInputSchema.parse({
        email: "user@example.com",
        password: "password123",
        passwordConfirmation: "password123",
        role: "admin",
      }),
    /Unrecognized key/,
  );
});

test("signInWithPasswordInputSchema rejects short password", () => {
  assert.throws(
    () =>
      signInWithPasswordInputSchema.parse({
        email: "user@example.com",
        password: "short",
      }),
    /8文字以上/,
  );
});

test("authNextPathSchema rejects external redirects", () => {
  assert.throws(() => authNextPathSchema.parse("https://evil.example.com"), /遷移先が不正です/);
});

const validAnonLinkNonce = "a".repeat(64);

test("anonymousLinkCompleteBodySchema rejects invalid nonce length", () => {
  assert.throws(
    () => anonymousLinkCompleteBodySchema.parse({ nonce: "abc" }),
    /トークン形式が不正です/,
  );
});

test("anonymousLinkCompleteBodySchema rejects extra keys", () => {
  assert.throws(
    () =>
      anonymousLinkCompleteBodySchema.parse({
        extra: "x",
        nonce: validAnonLinkNonce,
      }),
    /Unrecognized key/,
  );
});

test("updateStoreStatusInputSchema rejects invalid status", () => {
  assert.throws(
    () =>
      updateStoreStatusInputSchema.parse({
        recommendation: "",
        status: "queued",
        statusNote: "",
        weatherComment: "",
        menuStocks: {
          maguro_don: "available",
          maguro_don_mini: "available",
          tokujo_don: "few",
          tokujo_don_mini: "soldout",
        },
      }),
    /Invalid option/,
  );
});

test("updateStoreStatusInputSchema rejects numeric coercion attempts", () => {
  assert.throws(
    () =>
      updateStoreStatusInputSchema.parse({
        recommendation: "",
        status: 1,
        statusNote: "",
        weatherComment: "",
        menuStocks: {
          maguro_don: "available",
          maguro_don_mini: "available",
          tokujo_don: "few",
          tokujo_don_mini: "soldout",
        },
      }),
    /expected one of/,
  );
});

test("updateStoreStatusInputSchema rejects invalid menu stock enum", () => {
  assert.throws(
    () =>
      updateStoreStatusInputSchema.parse({
        recommendation: "",
        status: "open",
        statusNote: "",
        weatherComment: "",
        menuStocks: {
          maguro_don: "available",
          maguro_don_mini: "available",
          tokujo_don: "queued",
          tokujo_don_mini: "soldout",
        },
      }),
    /Invalid option/,
  );
});

test("updateStoreStatusInputSchema rejects unset store status", () => {
  assert.throws(
    () =>
      updateStoreStatusInputSchema.parse({
        recommendation: "",
        status: "unset",
        statusNote: "",
        weatherComment: "",
        menuStocks: {
          maguro_don: "available",
          maguro_don_mini: "available",
          tokujo_don: "few",
          tokujo_don_mini: "soldout",
        },
      }),
    /Invalid option/,
  );
});

test("updateStoreStatusInputSchema rejects unset menu stock", () => {
  assert.throws(
    () =>
      updateStoreStatusInputSchema.parse({
        recommendation: "",
        status: "open",
        statusNote: "",
        weatherComment: "",
        menuStocks: {
          maguro_don: "unset",
          maguro_don_mini: "available",
          tokujo_don: "few",
          tokujo_don_mini: "soldout",
        },
      }),
    /Invalid option/,
  );
});

test("displayNameOnlySchema accepts trimmed names with allowed punctuation", () => {
  assert.equal(displayNameOnlySchema.parse("  まぐろ太郎・1  "), "まぐろ太郎・1");
  assert.equal(displayNameOnlySchema.parse("山田ー子"), "山田ー子");
});

test("displayNameOnlySchema rejects empty after trim", () => {
  assert.throws(() => displayNameOnlySchema.parse("   "), /名前を入力/);
});

test("displayNameOnlySchema rejects overly long names", () => {
  assert.throws(() => displayNameOnlySchema.parse("a".repeat(33)), /32文字/);
});

test("displayNameOnlySchema rejects disallowed characters", () => {
  assert.throws(() => displayNameOnlySchema.parse("test@user"), /記号/);
  assert.throws(() => displayNameOnlySchema.parse("😀まぐろ"), /記号/);
});
