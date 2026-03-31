import React from "react";
import clsx from "clsx";
import type { ComponentPropsWithoutRef } from "react";

function CardInner({
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

export const Card = React.memo(CardInner);
Card.displayName = "Card";
