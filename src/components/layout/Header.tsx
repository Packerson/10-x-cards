import { useMemo } from "react"

import { useProfile } from "@/components/hooks/useProfile"
import { cn } from "@/lib/utils"
import { NavLink } from "./NavLink"
import { MobileMenu, type HeaderNavItem } from "./MobileMenu"
import { UserMenu } from "./UserMenu"

interface HeaderProps {
  currentPath: string
}

export function Header({ currentPath }: HeaderProps) {
  const { status, profile } = useProfile()

  const isAuthenticated = status === "authenticated"

  const navItems = useMemo<HeaderNavItem[]>(() => {
    // Uwaga: w aktualnym repo istnieją tylko strony: /, /generate, /cards.
    // Elementy typu "Historia" są zgodne z planem, ale route nie istnieje -> disabled.
    if (!isAuthenticated) {
      return [
        { href: "/login", label: "Zaloguj się", disabled: true },
        { href: "/register", label: "Zarejestruj", disabled: true },
      ]
    }

    return [
      { href: "/generate", label: "Generuj fiszki" },
      { href: "/cards", label: "Moje fiszki" },
      { href: "/generations", label: "Historia", disabled: true },
    ]
  }, [isAuthenticated])

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <a
          href="/"
          className={cn(
            "text-base font-semibold tracking-tight",
            "text-foreground hover:opacity-90"
          )}
          aria-label="Przejdź na stronę główną"
        >
          10x-cards
        </a>

        {/* Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          <nav className="flex items-center gap-6" aria-label="Nawigacja">
            {navItems
              .filter((x) => isAuthenticated || x.label !== "Wyloguj się")
              .map((item) => (
                <NavLink
                  key={item.href + item.label}
                  href={item.href}
                  label={item.label}
                  currentPath={currentPath}
                  disabled={item.disabled}
                />
              ))}
          </nav>

          {isAuthenticated && <UserMenu profile={profile} />}
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <MobileMenu
            currentPath={currentPath}
            navItems={navItems}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </header>
  )
}

