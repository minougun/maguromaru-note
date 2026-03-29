import Image from "next/image";

const BRAND_MARK_SRC = "/brand/maguromaru-mark.webp";

/** ヘッダー・入荷カードなどで使う「まぐろ丸」マーク（円相風アート） */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      <Image
        alt=""
        className="brand-mark-img"
        height={256}
        priority
        sizes="42px"
        src={BRAND_MARK_SRC}
        width={256}
      />
    </span>
  );
}
