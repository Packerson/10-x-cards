import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseAuthErrorResponse } from "@/lib/api/auth-errors";

const PASSWORD_MIN_LENGTH = 8;
const SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/;

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

interface ResetPasswordFormProps {
  linkError?: string | null;
}

export function ResetPasswordForm({ linkError }: ResetPasswordFormProps) {
  const passwordId = useId();
  const confirmId = useId();

  const [authCode, setAuthCode] = useState<string | null>(null);
  const [linkErrorMessage, setLinkErrorMessage] = useState<string | null>(linkError ?? null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (linkErrorMessage) return false;
    if (!authCode) return false;
    return validatePassword(password) === null && validatePasswordConfirm(password, confirm) === null;
  }, [authCode, confirm, linkErrorMessage, password]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const nextPasswordError = validatePassword(password);
      const nextConfirmError = validatePasswordConfirm(password, confirm);
      setPasswordError(nextPasswordError);
      setConfirmError(nextConfirmError);
      setFormError(null);
      if (nextPasswordError || nextConfirmError) return;
      if (!authCode) {
        setLinkErrorMessage("Brakuje danych z linku resetującego. Poproś o nowy link.");
        return;
      }

      setIsSubmitting(true);
      try {
        const payload = {
          newPassword: password,
          newPasswordConfirm: confirm,
          code: authCode,
        };

        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const { errorCode, fieldErrors } = await parseAuthErrorResponse(response);
          if (errorCode === "validation_error") {
            if (fieldErrors?.newPassword?.[0]) {
              setPasswordError(fieldErrors.newPassword[0]);
            } else {
              const validation = validatePassword(password);
              if (validation) setPasswordError(validation);
            }

            if (fieldErrors?.newPasswordConfirm?.[0]) {
              setConfirmError(fieldErrors.newPasswordConfirm[0]);
            } else {
              const validation = validatePasswordConfirm(password, confirm);
              if (validation) setConfirmError(validation);
            }

            setFormError("Uzupełnij poprawnie wymagane pola.");
          } else if (errorCode === "token_expired") {
            setLinkErrorMessage("Link resetujący wygasł. Poproś o nowy link.");
          } else if (errorCode === "invalid_token") {
            setLinkErrorMessage("Link resetujący jest nieprawidłowy. Poproś o nowy link.");
          } else if (errorCode === "weak_password") {
            setPasswordError("Hasło jest zbyt słabe.");
          } else {
            setFormError("Nie udało się zmienić hasła. Spróbuj ponownie.");
          }
          return;
        }

        setSubmitted(true);
        window.setTimeout(() => {
          window.location.assign("/");
        }, 1200);
      } catch {
        setFormError("Nie udało się połączyć z serwerem.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [authCode, confirm, password]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    const hashParams = new URLSearchParams(hash);
    const hashError = hashParams.get("error");
    const hashErrorCode = hashParams.get("error_code");
    const hashErrorDescription = hashParams.get("error_description");
    const queryErrorCode = url.searchParams.get("error_code");
    const code = url.searchParams.get("code");
    const queryType = url.searchParams.get("type");
    if (hashError || hashErrorCode || queryErrorCode) {
      if (hashErrorCode === "otp_expired" || queryErrorCode === "otp_expired") {
        setLinkErrorMessage("Link resetujący wygasł. Poproś o nowy link.");
      } else if (hashErrorCode === "invalid_token" || queryErrorCode === "invalid_token") {
        setLinkErrorMessage("Link resetujący jest nieprawidłowy. Poproś o nowy link.");
      } else if (hashErrorDescription) {
        setLinkErrorMessage(decodeURIComponent(hashErrorDescription.replace(/\+/g, " ")));
      } else {
        setLinkErrorMessage("Link resetujący jest nieprawidłowy. Poproś o nowy link.");
      }
    } else if (code && (queryType === "recovery" || !queryType)) {
      setAuthCode(code);
      setLinkErrorMessage(null);
    } else {
      setLinkErrorMessage("Brakuje linku resetującego. Poproś o nowy link.");
    }

    window.history.replaceState(null, "", url.pathname);
  }, []);

  return (
    <section className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ustaw nowe hasło</h1>
        <p className="text-sm text-muted-foreground">
          Podaj nowe hasło. Po zapisaniu automatycznie wrócisz na stronę główną.
        </p>
      </header>

      {linkErrorMessage && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {linkErrorMessage}
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} aria-busy={isSubmitting}>
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
              setPassword(event.target.value);
              setPasswordError(null);
              setSubmitted(false);
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
            name="newPasswordConfirm"
            type="password"
            autoComplete="new-password"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Powtórz nowe hasło"
            value={confirm}
            onChange={(event) => {
              setConfirm(event.target.value);
              setConfirmError(null);
              setSubmitted(false);
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

        {submitted && (
          <div
            role="status"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
          >
            Hasło zostało zmienione. Za chwilę przeniesiemy Cię na stronę główną.
          </div>
        )}

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "Zapisywanie..." : "Zapisz nowe hasło"}
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
  );
}
