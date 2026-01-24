import { useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

const PASSWORD_MIN_LENGTH = 8
const SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/

function validatePassword(value: string): string | null {
  if (!value) return "Hasło jest wymagane."
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`
  }
  if (!SPECIAL_CHAR_PATTERN.test(value)) {
    return "Hasło musi zawierać co najmniej jeden znak specjalny."
  }
  return null
}

function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return "Potwierdzenie hasła jest wymagane."
  if (password !== confirm) return "Hasła muszą być zgodne."
  return null
}

interface ResetPasswordFormProps {
  linkError?: string | null
}

export function ResetPasswordForm({ linkError }: ResetPasswordFormProps) {
  const passwordId = useId()
  const confirmId = useId()

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const canSubmit = useMemo(() => {
    return (
      validatePassword(password) === null &&
      validatePasswordConfirm(password, confirm) === null
    )
  }, [password, confirm])

  return (
    <section className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ustaw nowe hasło</h1>
        <p className="text-sm text-muted-foreground">
          Podaj nowe hasło. Po zapisaniu automatycznie wrócisz do generatora.
        </p>
      </header>

      {linkError && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {linkError}
        </div>
      )}

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const nextPasswordError = validatePassword(password)
          const nextConfirmError = validatePasswordConfirm(password, confirm)
          setPasswordError(nextPasswordError)
          setConfirmError(nextConfirmError)
          if (nextPasswordError || nextConfirmError) return
          setSubmitted(true)
        }}
      >
        <div className="space-y-1">
          <label htmlFor={passwordId} className="text-sm font-medium text-foreground">
            Nowe hasło
          </label>
          <input
            id={passwordId}
            name="newPassword"
            type="password"
            autoComplete="new-password"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Minimum 8 znaków i 1 znak specjalny"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setPasswordError(null)
              setSubmitted(false)
            }}
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? `${passwordId}-error` : undefined}
          />
          {passwordError && (
            <p id={`${passwordId}-error`} role="alert" className="text-sm text-destructive">
              {passwordError}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor={confirmId} className="text-sm font-medium text-foreground">
            Potwierdź hasło
          </label>
          <input
            id={confirmId}
            name="newPasswordConfirm"
            type="password"
            autoComplete="new-password"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Powtórz nowe hasło"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value)
              setConfirmError(null)
              setSubmitted(false)
            }}
            aria-invalid={Boolean(confirmError)}
            aria-describedby={confirmError ? `${confirmId}-error` : undefined}
          />
          {confirmError && (
            <p id={`${confirmId}-error`} role="alert" className="text-sm text-destructive">
              {confirmError}
            </p>
          )}
        </div>

        {submitted && (
          <div
            role="status"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            Hasło zostało zmienione. Za chwilę przeniesiemy Cię do generatora.
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
          Zapisz nowe hasło
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Wróć do{" "}
        <a href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
          logowania
        </a>
        .
      </p>
    </section>
  )
}
