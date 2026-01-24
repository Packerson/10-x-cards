import { z } from "zod"

const PASSWORD_MIN_LENGTH = 8
const SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9]/

export const authLoginSchema = z.object({
  email: z.string().trim().email({ message: "Podaj poprawny adres email." }),
  password: z.string().min(1, { message: "Hasło jest wymagane." }),
})

export const authRegisterSchema = z
  .object({
    email: z.string().trim().email({ message: "Podaj poprawny adres email." }),
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, {
        message: `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`,
      })
      .regex(SPECIAL_CHAR_PATTERN, {
        message: "Hasło musi zawierać co najmniej jeden znak specjalny.",
      }),
    passwordConfirm: z.string().min(1, { message: "Potwierdzenie hasła jest wymagane." }),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Hasła muszą być zgodne.",
  })

export const authForgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: "Podaj poprawny adres email." }),
})

export const authResetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, {
        message: `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`,
      })
      .regex(SPECIAL_CHAR_PATTERN, {
        message: "Hasło musi zawierać co najmniej jeden znak specjalny.",
      }),
    newPasswordConfirm: z.string().min(1, { message: "Potwierdzenie hasła jest wymagane." }),
    code: z.string().min(1, { message: "Brak kodu resetu." }),
  })
  .refine((values) => values.newPassword === values.newPasswordConfirm, {
    path: ["newPasswordConfirm"],
    message: "Hasła muszą być zgodne.",
  })

export type AuthLoginInput = z.infer<typeof authLoginSchema>
export type AuthRegisterInput = z.infer<typeof authRegisterSchema>
export type AuthForgotPasswordInput = z.infer<typeof authForgotPasswordSchema>
export type AuthResetPasswordInput = z.infer<typeof authResetPasswordSchema>
