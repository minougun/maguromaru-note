import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

export function Card({
  children,
  glow = false,
  className,
  ...props
}: ComponentPropsWithoutRef<"section"> & { glow?: boolean }) {
  return (
    <section className={clsx("card", glow && "glow", className)} {...props}>
      {children}
    </section>
  );
}
