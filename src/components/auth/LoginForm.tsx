import { useCallback, useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { parseAuthErrorResponse } from "@/lib/api/auth-errors"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return "Email jest wymagany."
  if (!EMAIL_PATTERN.test(trimmed)) return "Podaj poprawny adres email."
  return null
}

function validatePassword(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return "Hasło jest wymagane."
  return null
}

export function LoginForm() {
  const emailId = useId()
  const passwordId = useId()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = useMemo(() => {
    return validateEmail(email) === null && validatePassword(password) === null
  }, [email, password])

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const nextEmailError = validateEmail(email)
      const nextPasswordError = validatePassword(password)
      setEmailError(nextEmailError)
      setPasswordError(nextPasswordError)
      setFormError(null)
      if (nextEmailError || nextPasswordError) return

      setIsSubmitting(true)
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        })

        if (!response.ok) {
          const { errorCode, fieldErrors } = await parseAuthErrorResponse(response)

          if (errorCode === "invalid_credentials") {
            setFormError("Nieprawidłowy email lub hasło.")
          } else if (errorCode === "validation_error") {
            if (fieldErrors?.email?.[0]) {
              setEmailError(fieldErrors.email[0])
            } else {
              const emailValidation = validateEmail(email)
              if (emailValidation) setEmailError(emailValidation)
            }

            if (fieldErrors?.password?.[0]) {
              setPasswordError(fieldErrors.password[0])
            } else {
              const passwordValidation = validatePassword(password)
              if (passwordValidation) setPasswordError(passwordValidation)
            }
            setFormError("Uzupełnij poprawnie wymagane pola.")
          } else {
            setFormError("Nie udało się zalogować. Spróbuj ponownie.")
          }
          return
        }

        window.location.assign("/")
      } catch {
        setFormError("Nie udało się połączyć z serwerem.")
      } finally {
        setIsSubmitting(false)
      }
    },
    [email, password],
  )

  return (
    <section
      className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm"
      data-testid="login-form"
    >
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Zaloguj się</h1>
        <p className="text-sm text-muted-foreground">
          Wróć do swoich fiszek i kontynuuj naukę.
        </p>
      </header>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <div className="space-y-1">
          <label htmlFor={emailId} className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="np. maria@domena.pl"
            value={email}
            data-testid="login-email-input"
            onChange={(event) => {
              setEmail(event.target.value)
              setEmailError(null)
              setFormError(null)
            }}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? `${emailId}-error` : undefined}
          />
          {emailError && (
            <p id={`${emailId}-error`} role="alert" className="text-sm text-destructive">
              {emailError}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor={passwordId} className="text-sm font-medium text-foreground">
            Hasło
          </label>
          <input
            id={passwordId}
            name="password"
            type="password"
            autoComplete="current-password"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Wpisz hasło"
            value={password}
            data-testid="login-password-input"
            onChange={(event) => {
              setPassword(event.target.value)
              setPasswordError(null)
              setFormError(null)
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

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto"
            disabled={!canSubmit || isSubmitting}
            data-testid="login-submit"
          >
            {isSubmitting ? "Logowanie..." : "Zaloguj się"}
          </Button>
          <a
            href="/auth/forgot-password"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Nie pamiętasz hasła?
          </a>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Nie masz konta?{" "}
        <a href="/auth/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Zarejestruj się
        </a>
      </p>
    </section>
  )
}
