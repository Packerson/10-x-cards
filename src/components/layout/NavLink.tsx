import { cn } from "@/lib/utils"

interface NavLinkProps {
  href: string
  label: string
  currentPath: string
  exact?: boolean
  onNavigate?: () => void
  disabled?: boolean
  testId?: string
}

function isActivePath(href: string, currentPath: string, exact: boolean): boolean {
  if (exact) return currentPath === href
  if (href === "/") return currentPath === "/"
  return currentPath === href || currentPath.startsWith(`${href}/`)
}

export function NavLink({
  href,
  label,
  currentPath,
  exact = false,
  onNavigate,
  disabled = false,
  testId,
}: NavLinkProps) {
  const isActive = isActivePath(href, currentPath, exact)

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={cn(
          "cursor-not-allowed select-none text-sm font-medium text-muted-foreground/70"
        )}
        title="Wkrótce"
        data-testid={testId}
      >
        {label}
      </span>
    )
  }

  return (
    <a
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        isActive && "text-foreground underline underline-offset-8"
      )}
      data-testid={testId}
    >
      {label}
    </a>
  )
}

