export const DEFAULT_LOGIN_PATH = "/";

/**
 * Ścieżka logowania (placeholder).
 *
 * UWAGA: auth/logowanie nie jest jeszcze wdrożone, więc na razie nie zakładamy
 * istnienia żadnego route typu `/login`.
 */
export function getLoginPath(): string {
  return DEFAULT_LOGIN_PATH;
}

/**
 * Prosty redirect “twardy” (pełny reload). Działa tylko w przeglądarce.
 */
export function redirectToLogin(): void {
  // UWAGA: logowanie nie jest jeszcze wdrożone, więc na razie celowo
  // nie wykonujemy żadnego redirectu.
  //
  // TODO(auth): odkomentować po dodaniu strony logowania i ustaleniu ścieżki.
  // if (typeof window === "undefined") return
  // window.location.assign(getLoginPath())
}
