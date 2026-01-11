import { useMemo, useRef } from "react"
import { User } from "lucide-react"

import type { GetProfileDTO } from "@/types"
import { cn } from "@/lib/utils"

interface UserMenuProps {
  profile: GetProfileDTO | null
  disabled?: boolean
}

export function UserMenu({ profile, disabled = false }: UserMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null)

  const userLabel = useMemo(() => {
    if (!profile) return "Konto"
    return `ID: ${profile.id.slice(0, 8)}…`
  }, [profile])

  const close = () => {
    detailsRef.current?.removeAttribute("open")
  }

  if (disabled) {
    return (
      <span
        className="inline-flex items-center gap-2 text-sm text-muted-foreground/70"
        title="Wkrótce"
      >
        <User className="h-4 w-4" aria-hidden="true" />
        Konto
      </span>
    )
  }

  return (
    <details ref={detailsRef} className="relative">
      <summary
        className={cn(
          "list-none inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm",
          "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-label="Menu użytkownika"
      >
        <User className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{userLabel}</span>
        <span className="sm:hidden">Konto</span>
      </summary>

      <div
        className={cn(
          "absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border bg-background shadow-sm"
        )}
        role="menu"
        aria-label="Opcje konta"
      >
        <div className="px-3 py-2 text-xs text-muted-foreground">{userLabel}</div>
        <div className="h-px bg-border" />

        {/* Brak strony /profile w aktualnym MVP — decyzja zależy od Ciebie */}
        <button
          type="button"
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
          onClick={() => close()}
          disabled
          aria-disabled="true"
          title="Wkrótce"
        >
          Mój profil
        </button>

        {/* Brak prawdziwego auth/logout w aktualnym MVP — decyzja zależy od Ciebie */}
        <button
          type="button"
          className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
          onClick={() => close()}
          disabled
          aria-disabled="true"
          title="Wkrótce"
        >
          Wyloguj się
        </button>
      </div>
    </details>
  )
}

