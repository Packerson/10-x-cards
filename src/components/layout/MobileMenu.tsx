import { useMemo, useRef } from "react"
import { Menu } from "lucide-react"

import { NavLink } from "./NavLink"
import { cn } from "@/lib/utils"

export interface HeaderNavItem {
  href: string
  label: string
  disabled?: boolean
}

interface MobileMenuProps {
  currentPath: string
  navItems: HeaderNavItem[]
  isAuthenticated: boolean
}

export function MobileMenu({
  currentPath,
  navItems,
  isAuthenticated,
}: MobileMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null)

  const close = () => {
    detailsRef.current?.removeAttribute("open")
  }

  const items = useMemo(() => navItems, [navItems])

  return (
    <details ref={detailsRef} className="relative md:hidden">
      <summary
        className={cn(
          "list-none inline-flex cursor-pointer items-center justify-center rounded-md px-3 py-2",
          "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-label="Otwórz menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </summary>

      <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-md border bg-background shadow-sm">
        <nav className="flex flex-col gap-3 px-4 py-4" aria-label="Nawigacja">
          {items.map((item) => (
            <NavLink
              key={`${item.href}:${item.label}`}
              href={item.href}
              label={item.label}
              currentPath={currentPath}
              onNavigate={close}
              disabled={item.disabled}
            />
          ))}

          {isAuthenticated && (
            <>
              <div className="my-1 h-px bg-border" />
              <span
                className="text-sm text-muted-foreground/70"
                aria-disabled="true"
                title="Wkrótce"
              >
                Mój profil
              </span>
              <span
                className="text-sm text-muted-foreground/70"
                aria-disabled="true"
                title="Wkrótce"
              >
                Wyloguj
              </span>
            </>
          )}
        </nav>
      </div>
    </details>
  )
}

