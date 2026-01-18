import { cn } from "@/lib/utils"
import type { CharacterCounterProps } from "./types"

export function CharacterCounter({ current, min, max }: CharacterCounterProps) {
  const isValid = current >= min && current <= max
  const isTooShort = current < min
  const isTooLong = current > max

  return (
    <span
      className={cn(
        "text-sm font-medium tabular-nums transition-colors",
        isValid && "text-emerald-600 dark:text-emerald-400",
        isTooShort && "text-amber-600 dark:text-amber-400",
        isTooLong && "text-destructive"
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {current.toLocaleString("pl-PL")} / {max.toLocaleString("pl-PL")}
      {isTooShort && (
        <span className="ml-1 text-xs">
          (min. {min.toLocaleString("pl-PL")})
        </span>
      )}
    </span>
  )
}
