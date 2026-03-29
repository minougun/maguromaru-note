import { z } from "zod";

import { menuItemIds, partIds, quizStageCount, storeStatuses } from "@/lib/domain/constants";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const allowedPhotoDataUrlRegex = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
const maxPhotoDataUrlLength = 6_000_000;

function isValidIsoDate(value: string) {
  if (!isoDateRegex.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const menuItemIdSchema = z.enum(menuItemIds);
export const partIdSchema = z.enum(partIds);
export const storeStatusSchema = z.enum(storeStatuses);
export const menuStockStatusSchema = z.enum(["available", "few", "soldout"]);
export const authEmailSchema = z.email("メールアドレスの形式が不正です。").trim().max(254);
export const authPasswordSchema = z
  .string()
  .min(8, "パスワードは8文字以上で入力してください。")
  .max(72, "パスワードは72文字以内で入力してください。");
export const authNextPathSchema = z
  .string()
  .trim()
  .refine((value) => value.startsWith("/") && !value.startsWith("//"), "遷移先が不正です。");
export const quizStageNumberSchema = z.number().int().min(1).max(quizStageCount);
export const visitLogIdSchema = z.uuid();
export const quizSessionIdSchema = z.uuid();
export const quizAnswerIndexSchema = z.number().int().min(0).max(3);
export const quizAnswerProofSchema = z.string().trim().min(1).max(2048);
export const shareTargetTypeSchema = z.enum(["visit_log", "quiz_session"]);
export const shareChannelSchema = z.enum(["x", "line", "instagram"]);
export const quizAnswerIndexesSchema = z
  .array(quizAnswerIndexSchema)
  .min(1, "少なくとも1つは選択してください。")
  .max(4, "選択数が多すぎます。")
  .superRefine((value, ctx) => {
    if (new Set(value).size !== value.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "同じ選択肢を重複して送信できません。",
      });
    }
  });

export const menuStocksSchema = z
  .object({
    maguro_don: menuStockStatusSchema,
    maguro_don_mini: menuStockStatusSchema,
    tokujo_don: menuStockStatusSchema,
    tokujo_don_mini: menuStockStatusSchema,
  })
  .strict();

export const recordVisitInputSchema = z
  .object({
    menuItemId: menuItemIdSchema,
    partIds: z.array(partIdSchema).max(partIds.length, "部位数が不正です。").default([]),
    memo: z
      .string()
      .trim()
      .max(120, "メモは120文字以内で入力してください。")
      .optional()
      .transform((value) => (value && value.length > 0 ? value : null)),
    photoDataUrl: z
      .string()
      .max(maxPhotoDataUrlLength, "画像データが大きすぎます。")
      .regex(allowedPhotoDataUrlRegex, "JPEG / PNG / WebP の base64 画像のみ送信できます。")
      .nullable()
      .optional()
      .default(null),
    visitedAt: z.string().refine(isValidIsoDate, "来店日の形式が不正です。").optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.partIds).size !== value.partIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["partIds"],
        message: "同じ部位を重複して記録できません。",
      });
    }
  });

export const updateStoreStatusInputSchema = z
  .object({
    recommendation: z.string().trim().max(280).default(""),
    status: storeStatusSchema,
    statusNote: z.string().trim().max(120).default(""),
    weatherComment: z.string().trim().max(120).default(""),
    menuStocks: menuStocksSchema,
  })
  .strict();

export const createQuizSessionInputSchema = z
  .object({
    stageNumber: quizStageNumberSchema,
  })
  .strict();

export const submitQuizSessionInputSchema = z
  .object({
    sessionId: quizSessionIdSchema,
    answers: z.array(quizAnswerIndexesSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.answers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["answers"],
        message: "回答が空です。",
      });
    }
  });

export const checkQuizAnswerInputSchema = z
  .object({
    sessionId: quizSessionIdSchema,
    questionId: z.string().trim().min(1),
    answerIndexes: quizAnswerIndexesSchema,
    answerProof: quizAnswerProofSchema.optional(),
  })
  .strict();

export const claimShareBonusInputSchema = z
  .object({
    targetType: shareTargetTypeSchema,
    targetId: z.uuid(),
    channel: shareChannelSchema,
  })
  .strict();

export const createEmailAccountInputSchema = z
  .object({
    email: authEmailSchema,
    password: authPasswordSchema,
    passwordConfirmation: authPasswordSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.password !== value.passwordConfirmation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["passwordConfirmation"],
        message: "確認用パスワードが一致しません。",
      });
    }
  });

export const signInWithPasswordInputSchema = z
  .object({
    email: authEmailSchema,
    password: authPasswordSchema,
  })
  .strict();
