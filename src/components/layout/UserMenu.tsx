import { useMemo, useRef } from "react";
import { User } from "lucide-react";

import { cn } from "@/lib/utils";

interface UserMenuProps {
  user: {
    display_name: string | null;
    email: string | null;
  } | null;
  disabled?: boolean;
}

const MAX_LABEL_LENGTH = 15;

function buildUserLabel(user: UserMenuProps["user"]): string {
  if (!user) return "Konto";

  const candidate = user.display_name || user.email;
  if (!candidate) return "Konto";

  if (candidate.length <= MAX_LABEL_LENGTH) {
    return candidate;
  }

  return `${candidate.slice(0, Math.max(0, MAX_LABEL_LENGTH - 1))}…`;
}

export function UserMenu({ user, disabled = false }: UserMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  const userLabel = useMemo(() => {
    return buildUserLabel(user);
  }, [user]);

  const close = () => {
    detailsRef.current?.removeAttribute("open");
  };

  if (disabled) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground/70" title="Wkrótce">
        <User className="h-4 w-4" aria-hidden="true" />
        Konto
      </span>
    );
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
        className={cn("absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-md border bg-background shadow-sm")}
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

        <a
          href="/auth/logout"
          className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
          onClick={() => close()}
        >
          Wyloguj się
        </a>
      </div>
    </details>
  );
}
