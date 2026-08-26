import { Coins } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCoins } from "@/lib/youtube";

export function CoinPill({
  amount,
  className,
  prefix,
}: {
  amount: number;
  className?: string;
  prefix?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-coin-foreground coin-gradient",
        className,
      )}
    >
      <Coins className="size-3.5" strokeWidth={2.4} />
      {prefix}
      {formatCoins(amount)}
    </span>
  );
}

export function AnimatedCoins({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums", className)} key={value}>
      {formatCoins(value)}
    </span>
  );
}
