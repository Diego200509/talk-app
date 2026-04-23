import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Correo no válido"),
  password: z.string().min(1, "Introduce tu contraseña"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(80, "El nombre es demasiado largo"),
    email: z.string().email("Correo no válido"),
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string().min(8, "Confirma tu contraseña"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });

export const forgotSchema = z.object({
  email: z.string().email("Correo no válido"),
});

export const resetSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirm: z.string().min(8, "Confirma tu contraseña"),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });
