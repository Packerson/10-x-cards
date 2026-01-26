import { z } from "zod";

/**
 * Body dla endpointu PATCH /api/profile (MVP).
 *
 * Uwaga: stosujemy preprocess z trim() aby poprawić UX (np. " pl "),
 * ale finalna wartość nadal musi należeć do enuma.
 */
export const updateProfileSchema = z.object({
  locale: z.preprocess((val) => (typeof val === "string" ? val.trim() : val), z.enum(["pl", "en"])),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
