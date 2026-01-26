import type { CardContentProps } from "./types";

export function CardContent({ front, back }: CardContentProps) {
  return (
    <div className="min-w-0 space-y-3">
      <div className="min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Przód</span>
        <p className="mt-1 break-words text-sm text-foreground">{front}</p>
      </div>
      <div className="min-w-0">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tył</span>
        <p className="mt-1 break-words text-sm text-foreground">{back}</p>
      </div>
    </div>
  );
}
