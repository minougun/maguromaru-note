import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { anonymousLinkCompleteBodySchema } from "@/lib/domain/schemas";
import { getSupabaseEnv, getSupabaseServiceEnv } from "@/lib/env";
import { AppServiceError } from "@/lib/services/app-service";

type QuizStatsRow = Database["public"]["Tables"]["quiz_stats"]["Row"];
type AnonymousLinkNonceRow = Database["public"]["Tables"]["anonymous_link_nonces"]["Row"];

const NONCE_TTL_MS = 15 * 60 * 1000;

/* eslint-disable @typescript-eslint/no-explicit-any */
function fromAny(client: SupabaseClient<Database>, relation: string): any {
  return (client as unknown as { from(table: string): unknown }).from(relation) as any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function createTokenSupabaseClient(accessToken: string) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createServiceRoleClient() {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseServiceEnv();
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function extractStoragePathFromPublicUrl(photoUrl: string | null) {
  if (!photoUrl) {
    return null;
  }

  const marker = "/don-photos/";
  const index = photoUrl.indexOf(marker);
  if (index < 0) {
    return null;
  }

  return decodeURIComponent(photoUrl.slice(index + marker.length));
}

function pickBetterBestScore(left: QuizStatsRow, right: QuizStatsRow) {
  if (left.best_score > right.best_score) {
    return { best_score: left.best_score, best_question_count: left.best_question_count };
  }
  if (left.best_score < right.best_score) {
    return { best_score: right.best_score, best_question_count: right.best_question_count };
  }
  return left.best_question_count >= right.best_question_count
    ? { best_score: left.best_score, best_question_count: left.best_question_count }
    : { best_score: right.best_score, best_question_count: right.best_question_count };
}

export function isMissingAuthAdminUserError(message: string | undefined) {
  return Boolean(message && /user not found/i.test(message));
}

async function migrateQuizStats(admin: SupabaseClient<Database>, fromUserId: string, toUserId: string) {
  const { data: fromRow, error: fromErr } = await fromAny(admin, "quiz_stats")
    .select("*")
    .eq("user_id", fromUserId)
    .maybeSingle();

  if (fromErr) {
    throw new AppServiceError(500, fromErr.message);
  }

  if (!fromRow) {
    return;
  }

  const { data: toRow, error: toErr } = await fromAny(admin, "quiz_stats")
    .select("*")
    .eq("user_id", toUserId)
    .maybeSingle();

  if (toErr) {
    throw new AppServiceError(500, toErr.message);
  }

  const now = new Date().toISOString();

  if (!toRow) {
    const { error: moveErr } = await fromAny(admin, "quiz_stats").update({ user_id: toUserId, updated_at: now }).eq("user_id", fromUserId);
    if (moveErr) {
      throw new AppServiceError(500, moveErr.message);
    }
    return;
  }

  const best = pickBetterBestScore(fromRow, toRow);
  const merged = {
    total_correct_answers: fromRow.total_correct_answers + toRow.total_correct_answers,
    total_answered_questions: fromRow.total_answered_questions + toRow.total_answered_questions,
    quizzes_completed: fromRow.quizzes_completed + toRow.quizzes_completed,
    best_score: best.best_score,
    best_question_count: best.best_question_count,
    updated_at: now,
  };

  const { error: mergeErr } = await fromAny(admin, "quiz_stats").update(merged).eq("user_id", toUserId);
  if (mergeErr) {
    throw new AppServiceError(500, mergeErr.message);
  }

  const { error: delErr } = await fromAny(admin, "quiz_stats").delete().eq("user_id", fromUserId);
  if (delErr) {
    throw new AppServiceError(500, delErr.message);
  }
}

async function migratePhotoPathsForLinkedUser(admin: SupabaseClient<Database>, fromUserId: string, toUserId: string) {
  const prefix = `${fromUserId}/`;
  const { data: logs, error } = await fromAny(admin, "visit_logs").select("id, photo_url").eq("user_id", toUserId);

  if (error) {
    throw new AppServiceError(500, error.message);
  }

  const bucket = admin.storage.from("don-photos");

  for (const log of logs ?? []) {
    const oldPath = extractStoragePathFromPublicUrl(log.photo_url);
    if (!oldPath || !oldPath.startsWith(prefix)) {
      continue;
    }

    const newPath = `${toUserId}/${oldPath.slice(prefix.length)}`;
    const { error: copyError } = await bucket.copy(oldPath, newPath);
    if (copyError) {
      continue;
    }

    const { data: pub } = bucket.getPublicUrl(newPath);
    const { error: upErr } = await fromAny(admin, "visit_logs").update({ photo_url: pub.publicUrl }).eq("id", log.id);
    if (upErr) {
      throw new AppServiceError(500, upErr.message);
    }

    await bucket.remove([oldPath]);
  }
}

async function claimAnonymousLinkNonce(
  admin: SupabaseClient<Database>,
  nonce: string,
  toUserId: string,
): Promise<{ fromUserId: string; completed: boolean }> {
  const nowIso = new Date().toISOString();
  const { data, error } = await fromAny(admin, "anonymous_link_nonces").select("*").eq("nonce", nonce).maybeSingle();

  if (error) {
    throw new AppServiceError(500, error.message);
  }

  const row = data as AnonymousLinkNonceRow | null;
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) {
    throw new AppServiceError(400, "無効または期限切れのトークンです。");
  }

  if (row.completed_at) {
    if (row.claimed_by_user_id && row.claimed_by_user_id !== toUserId) {
      throw new AppServiceError(409, "この連携トークンは別のアカウントで使用済みです。");
    }
    return { fromUserId: row.from_user_id, completed: true };
  }

  if (row.claimed_by_user_id && row.claimed_by_user_id !== toUserId) {
    throw new AppServiceError(409, "この連携トークンは別のアカウントで処理中です。");
  }

  if (!row.claimed_by_user_id) {
    const { data: claimedRow, error: claimError } = await fromAny(admin, "anonymous_link_nonces")
      .update({
        claimed_by_user_id: toUserId,
        claimed_at: nowIso,
      })
      .eq("id", row.id)
      .is("claimed_by_user_id", null)
      .select("id")
      .maybeSingle();

    if (claimError) {
      throw new AppServiceError(500, claimError.message);
    }
    if (!claimedRow) {
      throw new AppServiceError(409, "この連携トークンは別のアカウントで処理中です。");
    }
  }

  return { fromUserId: row.from_user_id, completed: false };
}

async function markAnonymousLinkNonceCompleted(admin: SupabaseClient<Database>, nonce: string, toUserId: string) {
  const { error } = await fromAny(admin, "anonymous_link_nonces")
    .update({
      claimed_by_user_id: toUserId,
      claimed_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .eq("nonce", nonce);

  if (error) {
    throw new AppServiceError(500, error.message);
  }
}

async function hasRemainingAnonymousSourceData(admin: SupabaseClient<Database>, fromUserId: string) {
  const checks = await Promise.all([
    fromAny(admin, "visit_logs").select("id", { count: "exact", head: true }).eq("user_id", fromUserId),
    fromAny(admin, "quiz_sessions").select("id", { count: "exact", head: true }).eq("user_id", fromUserId),
    fromAny(admin, "share_bonus_events").select("id", { count: "exact", head: true }).eq("user_id", fromUserId),
    fromAny(admin, "quiz_stats").select("user_id", { count: "exact", head: true }).eq("user_id", fromUserId),
  ]);

  for (const result of checks) {
    if (result.error) {
      throw new AppServiceError(500, result.error.message);
    }
    if ((result.count ?? 0) > 0) {
      return true;
    }
  }

  return false;
}

export async function prepareAnonymousLinkNonce(accessToken: string | undefined): Promise<{ nonce: string }> {
  if (!accessToken?.trim()) {
    throw new AppServiceError(401, "ログインが必要です。");
  }

  const userClient = createTokenSupabaseClient(accessToken);
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken);
  if (userError || !user) {
    throw new AppServiceError(401, "ログインが必要です。");
  }
  if (!user.is_anonymous) {
    throw new AppServiceError(400, "匿名セッションでのみ準備できます。");
  }

  const admin = createServiceRoleClient();
  await fromAny(admin, "anonymous_link_nonces").delete().eq("from_user_id", user.id);

  const nonce = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS).toISOString();

  const { error: insertError } = await fromAny(admin, "anonymous_link_nonces").insert({
    from_user_id: user.id,
    nonce,
    expires_at: expiresAt,
  });

  if (insertError) {
    throw new AppServiceError(500, insertError.message);
  }

  return { nonce };
}

export async function completeAnonymousLinkMigration(accessToken: string | undefined, rawBody: unknown): Promise<{ ok: true }> {
  if (!accessToken?.trim()) {
    throw new AppServiceError(401, "ログインが必要です。");
  }

  const body = anonymousLinkCompleteBodySchema.parse(rawBody);

  const userClient = createTokenSupabaseClient(accessToken);
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(accessToken);
  if (userError || !user) {
    throw new AppServiceError(401, "ログインが必要です。");
  }
  if (user.is_anonymous) {
    throw new AppServiceError(400, "連携後のアカウントで確定してください。しばらくしてから再読み込みしてください。");
  }

  const toUserId = user.id;
  const admin = createServiceRoleClient();
  const claim = await claimAnonymousLinkNonce(admin, body.nonce, toUserId);
  const fromUserId = claim.fromUserId;

  if (claim.completed) {
    return { ok: true };
  }

  if (fromUserId === toUserId) {
    await markAnonymousLinkNonceCompleted(admin, body.nonce, toUserId);
    return { ok: true };
  }

  const { data: fromAuth, error: authReadErr } = await admin.auth.admin.getUserById(fromUserId);
  const sourceUserMissing = !fromAuth.user || isMissingAuthAdminUserError(authReadErr?.message);
  if (authReadErr && !sourceUserMissing) {
    throw new AppServiceError(500, authReadErr.message);
  }
  if (sourceUserMissing) {
    if (!(await hasRemainingAnonymousSourceData(admin, fromUserId))) {
      await markAnonymousLinkNonceCompleted(admin, body.nonce, toUserId);
      return { ok: true };
    }
    throw new AppServiceError(400, "元のアカウントが見つかりません。");
  }
  if (!fromAuth.user.is_anonymous) {
    throw new AppServiceError(400, "元のアカウントはすでに別の方法で確定されています。");
  }

  const { error: visitErr } = await fromAny(admin, "visit_logs").update({ user_id: toUserId }).eq("user_id", fromUserId);
  if (visitErr) {
    throw new AppServiceError(500, visitErr.message);
  }

  const { error: sessionErr } = await fromAny(admin, "quiz_sessions").update({ user_id: toUserId }).eq("user_id", fromUserId);
  if (sessionErr) {
    throw new AppServiceError(500, sessionErr.message);
  }

  const { error: shareErr } = await fromAny(admin, "share_bonus_events").update({ user_id: toUserId }).eq("user_id", fromUserId);
  if (shareErr) {
    throw new AppServiceError(500, shareErr.message);
  }

  await migrateQuizStats(admin, fromUserId, toUserId);

  await migratePhotoPathsForLinkedUser(admin, fromUserId, toUserId);

  const { error: delUserError } = await admin.auth.admin.deleteUser(fromUserId);
  if (delUserError && !/not found/i.test(delUserError.message ?? "")) {
    throw new AppServiceError(500, delUserError.message);
  }

  await markAnonymousLinkNonceCompleted(admin, body.nonce, toUserId);

  return { ok: true };
}
