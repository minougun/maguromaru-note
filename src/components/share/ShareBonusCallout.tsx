type ShareBonusCalloutProps = {
  variant: "visit" | "quiz";
  /** シェアモーダル内など */
  compact?: boolean;
  alreadyClaimed?: boolean;
  className?: string;
};

/**
 * SNS シェアで来店回数／クイズ正解数に 1.2 倍ボーナスが入ることを強調表示する。
 */
export function ShareBonusCallout({ variant, compact, alreadyClaimed, className }: ShareBonusCalloutProps) {
  const rootClass = ["share-bonus-callout", compact ? "share-bonus-callout--compact" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  if (variant === "visit") {
    return (
      <aside className={rootClass} role="note">
        <p className="share-bonus-callout-headline">
          📣 SNSでシェアすると <em>来店回数が1.2倍</em>
        </p>
        <p className="share-bonus-callout-body">
          記録を <strong className="share-bonus-callout-strong">X・LINE・Instagram</strong>{" "}
          から投稿すると、その<strong className="share-bonus-callout-strong">1件の来店記録</strong>が
          通常より<strong className="share-bonus-callout-strong">1.2倍</strong>でカウントされます（来店回数・称号の集計に反映）。
        </p>
        <p className="share-bonus-callout-note">※ 同じ記録につきボーナスは1回までです。</p>
        {alreadyClaimed ? <p className="share-bonus-callout-claimed">この記録のボーナスは受取済みです。</p> : null}
      </aside>
    );
  }

  return (
    <aside className={rootClass} role="note">
      <p className="share-bonus-callout-headline">
        📣 SNSでシェアすると <em>クイズ正解数が1.2倍</em>
      </p>
      <p className="share-bonus-callout-body">
        クイズ結果を <strong className="share-bonus-callout-strong">X・LINE・Instagram</strong>{" "}
        から投稿すると、<strong className="share-bonus-callout-strong">今回チャレンジの正解数</strong>が
        通常より<strong className="share-bonus-callout-strong">1.2倍</strong>でカウントされます（正解済みの問題数・称号の集計に反映）。
      </p>
      <p className="share-bonus-callout-note">※ 同じクイズ結果につきボーナスは1回までです。</p>
      {alreadyClaimed ? <p className="share-bonus-callout-claimed">この結果のボーナスは受取済みです。</p> : null}
    </aside>
  );
}
