import { useCallback, useEffect, useMemo, useState } from "react"

import type { GetProfileDTO } from "@/types"
import { ApiError } from "@/lib/api/api-error"
import { getProfile } from "@/lib/api/profile"

type ProfileStatus = "idle" | "loading" | "authenticated" | "unauthenticated" | "error"

interface UseProfileResult {
  status: ProfileStatus
  profile: GetProfileDTO | null
  errorMessage: string | null
  refetch: () => void
}

export function useProfile(): UseProfileResult {
  const [status, setStatus] = useState<ProfileStatus>("idle")
  const [profile, setProfile] = useState<GetProfileDTO | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const refetch = useCallback(() => setNonce((x) => x + 1), [])

  useEffect(() => {
    let cancelled = false

    async function run() {
      setStatus("loading")
      setErrorMessage(null)

      try {
        const data = await getProfile()
        if (cancelled) return
        setProfile(data)
        setStatus("authenticated")
      } catch (err) {
        if (cancelled) return

        if (err instanceof ApiError && err.status === 401) {
          setProfile(null)
          setStatus("unauthenticated")
          return
        }

        setProfile(null)
        setStatus("error")
        setErrorMessage(
          err instanceof ApiError
            ? "Nie udało się pobrać profilu"
            : "Nieoczekiwany błąd"
        )
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [nonce])

  return useMemo(
    () => ({ status, profile, errorMessage, refetch }),
    [status, profile, errorMessage, refetch]
  )
}

