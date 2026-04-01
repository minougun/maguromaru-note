import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { verifySupabaseSecuritySql } from "@/lib/supabase-security-verifier";

async function readMigrationSql() {
  const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
  const entries = await readdir(migrationsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();

  const chunks = await Promise.all(
    files.map(async (fileName) => {
      const fullPath = path.join(migrationsDir, fileName);
      const sql = await readFile(fullPath, "utf8");
      return `-- ${fileName}\n${sql.trim()}\n`;
    }),
  );

  return chunks.join("\n");
}

async function main() {
  const sql = await readMigrationSql();
  verifySupabaseSecuritySql(sql);
  process.stdout.write("Supabase migration security verification passed.\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
