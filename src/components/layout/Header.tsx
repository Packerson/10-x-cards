import { useMemo } from "react";

import { useProfile } from "@/components/hooks/useProfile";
import { NavLink } from "./NavLink";
import { MobileMenu, type HeaderNavItem } from "./MobileMenu";
import { UserMenu } from "./UserMenu";

interface HeaderProps {
  currentPath: string;
  initialIsAuthenticated?: boolean;
  initialUser?: {
    id: string;
    email: string | null;
    display_name: string | null;
  };
}

export function Header({ currentPath, initialIsAuthenticated, initialUser }: HeaderProps) {
  const { status } = useProfile();

  const isAuthenticated =
    status === "authenticated" ? true : status === "unauthenticated" ? false : (initialIsAuthenticated ?? false);

  const navItems = useMemo<HeaderNavItem[]>(() => {
    // Elementy typu "Historia" są zgodne z planem, ale route nie istnieje -> disabled.
    if (!isAuthenticated) {
      return [
        { href: "/auth/login", label: "Zaloguj się", testId: "header-nav-login" },
        { href: "/auth/register", label: "Zarejestruj", testId: "header-nav-register" },
      ];
    }

    return [
      { href: "/generate", label: "Generuj fiszki", testId: "header-nav-generate" },
      { href: "/cards", label: "Moje fiszki", testId: "header-nav-cards" },
      { href: "/generations", label: "Historia", disabled: true, testId: "header-nav-history" },
    ];
  }, [isAuthenticated]);

  return (
    <header className="border-b bg-background" data-testid="site-header">
      <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <a
          href="/"
          className="flex items-center text-foreground hover:opacity-90"
          aria-label="Przejdź na stronę główną"
          data-testid="header-logo"
        >
          <img src="/logo_light.svg" alt="Braninlyx AI" className="h-14 w-auto drop-shadow-lg" width={720} height={260} />
        </a>

        {/* Desktop */}
        <div className="hidden items-center gap-6 md:flex">
          <nav className="flex items-center gap-6" aria-label="Nawigacja" data-testid="header-nav-desktop">
            {navItems
              .filter((x) => isAuthenticated || x.label !== "Wyloguj się")
              .map((item) => (
                <NavLink
                  key={item.href + item.label}
                  href={item.href}
                  label={item.label}
                  currentPath={currentPath}
                  disabled={item.disabled}
                  testId={item.testId}
                />
              ))}
          </nav>

          {isAuthenticated && <UserMenu user={initialUser ?? null} />}
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <MobileMenu currentPath={currentPath} navItems={navItems} isAuthenticated={isAuthenticated} />
        </div>
      </div>
    </header>
  );
}
