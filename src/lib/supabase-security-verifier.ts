import assert from "node:assert/strict";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expectMatch(sql: string, pattern: RegExp, description: string) {
  assert.match(sql, pattern, description);
}

function expectNoMatch(sql: string, pattern: RegExp, description: string) {
  assert.doesNotMatch(sql, pattern, description);
}

function expectRlsEnabled(sql: string, table: string) {
  const escapedTable = escapeRegExp(table);
  expectMatch(sql, new RegExp(`alter table public\\.${escapedTable}\\s+enable row level security;`, "i"), `${table}: RLS must be enabled`);
  expectMatch(sql, new RegExp(`alter table public\\.${escapedTable}\\s+force row level security;`, "i"), `${table}: forced RLS is required`);
  expectMatch(
    sql,
    new RegExp(`revoke all on public\\.${escapedTable} from anon, authenticated(?:, public)?;`, "i"),
    `${table}: anon/authenticated grants must be revoked before allowlisting`,
  );
}

function expectGrant(sql: string, table: string, grantClause: string, role: "authenticated" | "service_role") {
  const escapedTable = escapeRegExp(table);
  const escapedGrant = escapeRegExp(grantClause);
  expectMatch(
    sql,
    new RegExp(`grant ${escapedGrant} on public\\.${escapedTable} to ${role};`, "i"),
    `${table}: expected grant "${grantClause}" to ${role}`,
  );
}

function expectPolicy(sql: string, table: string, policyName: string) {
  const escapedTable = escapeRegExp(table);
  const escapedPolicy = escapeRegExp(policyName);
  expectMatch(
    sql,
    new RegExp(`create policy "${escapedPolicy}"\\s+on public\\.${escapedTable}\\b`, "i"),
    `${table}: missing policy ${policyName}`,
  );
}

function expectServiceRoleOnly(sql: string, table: string) {
  const escapedTable = escapeRegExp(table);
  expectGrant(sql, table, "all", "service_role");
  expectNoMatch(
    sql,
    new RegExp(`grant [^;]+ on public\\.${escapedTable} to authenticated;`, "i"),
    `${table}: authenticated grants should not exist`,
  );
  expectNoMatch(
    sql,
    new RegExp(`create policy "[^"]+"\\s+on public\\.${escapedTable}\\b`, "i"),
    `${table}: user-facing policies should not exist`,
  );
}

function expectConstraint(sql: string, pattern: RegExp, description: string) {
  expectMatch(sql, pattern, description);
}

export function verifySupabaseSecuritySql(sql: string) {
  const readableTables = [
    {
      table: "parts",
      authenticatedGrant: "select",
      policies: ["parts_read"],
    },
    {
      table: "menu_items",
      authenticatedGrant: "select",
      policies: ["menu_read"],
    },
    {
      table: "visit_logs",
      authenticatedGrant: "select, insert, delete",
      policies: ["own_logs_select", "own_logs_insert", "own_logs_delete"],
    },
    {
      table: "visit_log_parts",
      authenticatedGrant: "select, insert",
      policies: ["own_parts_select", "own_parts_insert"],
    },
    {
      table: "store_status",
      authenticatedGrant: "select",
      policies: ["status_read"],
    },
    {
      table: "quiz_stats",
      authenticatedGrant: "select, insert, update",
      policies: ["quiz_stats_select_own", "quiz_stats_insert_own", "quiz_stats_update_own"],
    },
    {
      table: "menu_item_statuses",
      authenticatedGrant: "select",
      policies: ["menu_item_statuses_read"],
    },
    {
      table: "store_ai_blurbs",
      authenticatedGrant: "select",
      policies: ["store_ai_blurbs_read"],
    },
  ] as const;

  for (const entry of readableTables) {
    expectRlsEnabled(sql, entry.table);
    expectGrant(sql, entry.table, entry.authenticatedGrant, "authenticated");
    expectGrant(sql, entry.table, "all", "service_role");
    for (const policy of entry.policies) {
      expectPolicy(sql, entry.table, policy);
    }
  }

  for (const table of ["quiz_sessions", "anonymous_link_nonces", "share_bonus_events"] as const) {
    expectRlsEnabled(sql, table);
    expectServiceRoleOnly(sql, table);
  }

  expectConstraint(
    sql,
    /question_count integer not null check \(question_count in \(10, 20, 30, 50\)\)/i,
    "quiz_sessions: question_count allowlist must remain closed",
  );
  expectConstraint(
    sql,
    /constraint quiz_sessions_question_ids_array check \(jsonb_typeof\(question_ids\) = 'array'\)/i,
    "quiz_sessions: question_ids must stay an array",
  );
  expectConstraint(
    sql,
    /constraint quiz_sessions_expiry_order check \(expires_at > created_at\)/i,
    "quiz_sessions: expiry ordering constraint is required",
  );
  expectConstraint(
    sql,
    /alter table public\.quiz_sessions\s+add column if not exists score integer not null default 0;/i,
    "quiz_sessions: score column migration is required",
  );
  expectConstraint(
    sql,
    /alter table public\.quiz_sessions\s+add column if not exists correct_question_ids jsonb;/i,
    "quiz_sessions: correct_question_ids migration is required",
  );

  expectConstraint(
    sql,
    /nonce text not null unique/i,
    "anonymous_link_nonces: nonce must stay unique",
  );
  expectConstraint(
    sql,
    /constraint anonymous_link_nonces_nonce_length check \(char_length\(nonce\) = 64\)/i,
    "anonymous_link_nonces: nonce length check is required",
  );

  expectConstraint(
    sql,
    /target_type text not null check \(target_type in \('visit_log', 'quiz_session'\)\)/i,
    "share_bonus_events: target_type allowlist must remain closed",
  );
  expectConstraint(
    sql,
    /channel text not null check \(channel in \('x', 'line', 'instagram'\)\)/i,
    "share_bonus_events: channel allowlist must remain closed",
  );
  expectConstraint(
    sql,
    /constraint share_bonus_events_target_unique unique \(user_id, target_type, target_id\)/i,
    "share_bonus_events: duplicate bonus protection is required",
  );

  expectConstraint(
    sql,
    /create unique index store_ai_blurbs_one_closing_per_day\s+on public\.store_ai_blurbs \(jst_date\)\s+where kind = 'closing_summary';/i,
    "store_ai_blurbs: only one closing summary per day is allowed",
  );
}
