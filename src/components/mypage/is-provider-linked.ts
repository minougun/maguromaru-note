import type { BrowserAuthProfile } from "@/lib/supabase/browser";

export function isProviderLinked(profile: BrowserAuthProfile | null, provider: string) {
  return Boolean(profile?.identityProviders.includes(provider));
}
