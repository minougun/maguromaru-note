import { z } from "zod";

import { menuItemIds, menuStatuses, partIds } from "@/lib/domain/constants";

const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const partIdSchema = z.enum(partIds);
export const menuItemIdSchema = z.enum(menuItemIds);
export const menuStatusValueSchema = z.enum(menuStatuses);

export const memoSchema = z
  .string()
  .trim()
  .max(120, "メモは120文字以内で入力してください。")
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

export const recordVisitInputSchema = z
  .object({
    visitedAt: z
      .string()
      .regex(isoDateRegex, "日付形式が不正です。"),
    partIds: z
      .array(partIdSchema)
      .min(1, "部位を1つ以上選択してください。")
      .max(partIds.length, "部位数が不正です。"),
    memo: memoSchema,
    photoDataUrl: z
      .string()
      .startsWith("data:image/", "画像形式が不正です。")
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const uniquePartIds = new Set(value.partIds);
    if (uniquePartIds.size !== value.partIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["partIds"],
        message: "同じ部位を重複して記録できません。",
      });
    }
  });

export const upsertMenuStatusInputSchema = z
  .object({
    menuItemId: menuItemIdSchema,
    status: menuStatusValueSchema,
  })
  .strict();

export const shareKindSchema = z.enum(["record", "log", "zukan", "title"]);

export const partSeedSchema = z.object({
  id: partIdSchema,
  name: z.string().min(1),
  area: z.string().min(1),
  rarity: z.number().int().min(1).max(3),
  description: z.string().min(1),
  color: z.string().regex(hexColorRegex),
  sort_order: z.number().int().min(1),
});
