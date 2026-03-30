"use client";

import { useEffect, useRef, useState } from "react";

const NEAR_TOP_PX = 12;
const DELTA_THRESHOLD = 10;
const MIN_SCROLLABLE_GAP = 32;

/**
 * メイン縦スクロールに応じて下部タブを隠す（下方向）／出す（上方向・先頭付近）。
 * prefers-reduced-motion では常に表示。
 */
export function useTabBarScrollVisibility(scrollRoot: HTMLElement | null, pathname: string) {
  const [visible, setVisible] = useState(true);
  const lastScrollTopRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setVisible(true);
    if (scrollRoot) {
      lastScrollTopRef.current = scrollRoot.scrollTop;
    } else {
      lastScrollTopRef.current = 0;
    }
  }, [pathname, scrollRoot]);

  useEffect(() => {
    const el = scrollRoot;
    if (!el) {
      return;
    }

    lastScrollTopRef.current = el.scrollTop;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleShowAfterIdle = () => {
      if (idleTimer != null) {
        clearTimeout(idleTimer);
      }
      idleTimer = setTimeout(() => {
        idleTimer = null;
        if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          return;
        }
        setVisible(true);
      }, 420);
    };

    const applyScroll = () => {
      if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setVisible(true);
        return;
      }

      const y = el.scrollTop;
      const prev = lastScrollTopRef.current;
      const delta = y - prev;
      lastScrollTopRef.current = y;

      const canScroll = el.scrollHeight > el.clientHeight + MIN_SCROLLABLE_GAP;
      if (!canScroll) {
        setVisible(true);
        return;
      }

      if (y <= NEAR_TOP_PX) {
        setVisible(true);
        return;
      }

      if (delta > DELTA_THRESHOLD) {
        setVisible(false);
      } else if (delta < -DELTA_THRESHOLD) {
        setVisible(true);
      }
    };

    const onScroll = () => {
      scheduleShowAfterIdle();
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        applyScroll();
      });
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    applyScroll();

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (idleTimer != null) {
        clearTimeout(idleTimer);
      }
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [scrollRoot]);

  return visible;
}
