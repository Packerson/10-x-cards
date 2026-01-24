import { useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateEmail(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return "Email jest wymagany."
  if (!EMAIL_PATTERN.test(trimmed)) return "Podaj poprawny adres email."
  return null
}

export function ForgotPasswordForm() {
  const emailId = useId()
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const canSubmit = useMemo(() => validateEmail(email) === null, [email])

  return (
    <section className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Odzyskaj hasło</h1>
        <p className="text-sm text-muted-foreground">
          Podaj adres email, na który wyślemy link resetujący.
        </p>
      </header>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const nextEmailError = validateEmail(email)
          setEmailError(nextEmailError)
          if (nextEmailError) return
          setSubmitted(true)
        }}
      >
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
            onChange={(event) => {
              setEmail(event.target.value)
              setEmailError(null)
              setSubmitted(false)
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

        {submitted && (
          <div
            role="status"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            Jeśli konto istnieje, wysłaliśmy link resetujący.
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
          Wyślij link resetujący
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Pamiętasz hasło?{" "}
        <a href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Wróć do logowania
        </a>
      </p>
    </section>
  )
}
