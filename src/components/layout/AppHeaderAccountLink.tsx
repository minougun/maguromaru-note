"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppHeaderAccountLink() {
  const pathname = usePathname() ?? "";
  const active = pathname === "/mypage";

  return (
    <Link
      aria-current={active ? "page" : undefined}
      aria-label="設定"
      className="header-account-link"
      href="/mypage"
      prefetch={false}
    >
      <svg
        aria-hidden="true"
        className="header-account-link-icon"
        fill="none"
        height="24"
        viewBox="0 0 24 24"
        width="24"
      >
        <path
          d="M10.3 2.9h3.4l.5 2.2c.5.2 1 .4 1.4.8l2.1-.8 1.7 2.9-1.7 1.4c.1.5.2 1 .2 1.6s-.1 1.1-.2 1.6l1.7 1.4-1.7 2.9-2.1-.8c-.4.3-.9.6-1.4.8l-.5 2.2h-3.4l-.5-2.2c-.5-.2-1-.4-1.4-.8l-2.1.8-1.7-2.9 1.7-1.4a6.3 6.3 0 010-3.2L4.9 8l1.7-2.9 2.1.8c.4-.3.9-.6 1.4-.8l.2-2.2z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
        <circle
          cx="12"
          cy="12"
          r="2.8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    </Link>
  );
}
