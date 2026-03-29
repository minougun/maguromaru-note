import { redirect } from "next/navigation";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function buildQueryString(sp: Record<string, string | string[] | undefined>) {
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(sp)) {
    if (val === undefined) {
      continue;
    }
    q.set(key, Array.isArray(val) ? val[0] : val);
  }
  return q.toString();
}

/** メールの `next=/home` 等との互換用。クエリ（`auth=linked` 等）は `/` に引き継ぐ。 */
export default async function HomeAliasPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const qs = buildQueryString(sp);
  redirect(qs ? `/?${qs}` : "/");
}
