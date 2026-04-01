import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { verifySupabaseSecuritySql } from "@/lib/supabase-security-verifier";

function loadMigrationSql() {
  const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
  return readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => readFileSync(path.join(migrationsDir, fileName), "utf8"))
    .join("\n\n");
}

test("verifySupabaseSecuritySql accepts the current migration set", () => {
  const sql = loadMigrationSql();
  assert.doesNotThrow(() => verifySupabaseSecuritySql(sql));
});

test("verifySupabaseSecuritySql rejects authenticated access on service-role-only tables", () => {
  const sql = `${loadMigrationSql()}\ngrant select on public.share_bonus_events to authenticated;\n`;
  assert.throws(
    () => verifySupabaseSecuritySql(sql),
    /share_bonus_events: authenticated grants should not exist/,
  );
});
