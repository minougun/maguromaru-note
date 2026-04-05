import { ZodError } from "zod";

import { AppServiceError } from "@/lib/services/app-service-error";

const GENERIC_SERVER_MESSAGE = "サーバーでエラーが発生しました。時間をおいて再度お試しください。";

export type ToRouteErrorOptions = {
  /** 未指定時は `process.env.NODE_ENV === "production"` */
  sanitizeInternalErrors?: boolean;
};

function shouldSanitizeInternalErrors(options?: ToRouteErrorOptions) {
  if (options?.sanitizeInternalErrors !== undefined) {
    return options.sanitizeInternalErrors;
  }
  return process.env.NODE_ENV === "production";
}

/**
 * Route Handler の catch 用。本番では意図しない `Error.message`（DB 内部文など）を返さない。
 */
export function toRouteError(error: unknown, logContext?: string, options?: ToRouteErrorOptions) {
  if (error instanceof AppServiceError) {
    return { status: error.status, message: error.message };
  }

  if (error instanceof ZodError) {
    return { status: 400, message: error.issues[0]?.message ?? "入力が不正です。" };
  }

  if (error instanceof SyntaxError) {
    return { status: 400, message: "リクエスト本文の形式が不正です。" };
  }

  if (error instanceof Error) {
    if (shouldSanitizeInternalErrors(options)) {
      console.error(logContext ? `[${logContext}]` : "[api]", error);
      return { status: 500, message: GENERIC_SERVER_MESSAGE };
    }
    return { status: 500, message: error.message };
  }

  if (shouldSanitizeInternalErrors(options)) {
    console.error(logContext ? `[${logContext}]` : "[api]", error);
  }

  return {
    status: 500,
    message: shouldSanitizeInternalErrors(options)
      ? GENERIC_SERVER_MESSAGE
      : "予期しないエラーが発生しました。",
  };
}
