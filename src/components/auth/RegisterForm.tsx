import { useCallback, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseAuthErrorResponse } from "@/lib/api/auth-errors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/;

function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Email jest wymagany.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Podaj poprawny adres email.";
  return null;
}

function validatePassword(value: string): string | null {
  if (!value) return "Hasło jest wymagane.";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`;
  }
  if (!SPECIAL_CHAR_PATTERN.test(value)) {
    return "Hasło musi zawierać co najmniej jeden znak specjalny.";
  }
  return null;
}

function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return "Potwierdzenie hasła jest wymagane.";
  if (password !== confirm) return "Hasła muszą być zgodne.";
  return null;
}

export function RegisterForm() {
  const emailId = useId();
  const passwordId = useId();
  const confirmId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      validateEmail(email) === null &&
      validatePassword(password) === null &&
      validatePasswordConfirm(password, confirm) === null
    );
  }, [email, password, confirm]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const nextEmailError = validateEmail(email);
      const nextPasswordError = validatePassword(password);
      const nextConfirmError = validatePasswordConfirm(password, confirm);
      setEmailError(nextEmailError);
      setPasswordError(nextPasswordError);
      setConfirmError(nextConfirmError);
      setFormError(null);
      if (nextEmailError || nextPasswordError || nextConfirmError) return;

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            passwordConfirm: confirm,
          }),
        });

        if (!response.ok) {
          const { errorCode, fieldErrors } = await parseAuthErrorResponse(response);

          if (errorCode === "user_already_exists") {
            setEmailError("Konto o tym adresie już istnieje.");
          } else if (errorCode === "validation_error") {
            if (fieldErrors?.email?.[0]) {
              setEmailError(fieldErrors.email[0]);
            } else {
              const validation = validateEmail(email);
              if (validation) setEmailError(validation);
            }

            if (fieldErrors?.password?.[0]) {
              setPasswordError(fieldErrors.password[0]);
            } else {
              const validation = validatePassword(password);
              if (validation) setPasswordError(validation);
            }

            if (fieldErrors?.passwordConfirm?.[0]) {
              setConfirmError(fieldErrors.passwordConfirm[0]);
            } else {
              const validation = validatePasswordConfirm(password, confirm);
              if (validation) setConfirmError(validation);
            }

            setFormError("Uzupełnij poprawnie wymagane pola.");
          } else {
            setFormError("Nie udało się utworzyć konta. Spróbuj ponownie.");
          }
          return;
        }

        window.location.assign("/");
      } catch {
        setFormError("Nie udało się połączyć z serwerem.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, confirm]
  );

  return (
    <section className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Załóż konto</h1>
        <p className="text-sm text-muted-foreground">Stwórz konto i zacznij budować własne zestawy fiszek.</p>
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
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError(null);
              setFormError(null);
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
            autoComplete="new-password"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Minimum 8 znaków i 1 znak specjalny"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              setPasswordError(null);
              setFormError(null);
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
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Powtórz hasło"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
              setConfirmError(null);
              setFormError(null);
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

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "Tworzenie konta..." : "Utwórz konto"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Masz już konto?{" "}
        <a href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
          Zaloguj się
        </a>
      </p>
    </section>
  );
}
