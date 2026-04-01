export const SECURITY_HEADER_ENTRIES = [
  ["Content-Security-Policy", "base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'"],
  ["Permissions-Policy", "accelerometer=(), autoplay=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  ["X-Content-Type-Options", "nosniff"],
  ["X-Frame-Options", "DENY"],
  ["X-Permitted-Cross-Domain-Policies", "none"],
] as const;

export function applySecurityHeaders(headers: Headers) {
  for (const [name, value] of SECURITY_HEADER_ENTRIES) {
    headers.set(name, value);
  }
  return headers;
}
