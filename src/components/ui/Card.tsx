import clsx from "clsx";

export function Card({
  children,
  glow = false,
  className,
}: {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
}) {
  return <section className={clsx("card", glow && "glow", className)}>{children}</section>;
}
