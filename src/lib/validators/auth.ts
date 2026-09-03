import { z } from "zod";
import { GENRE_OPTIONS } from "@/lib/validators/beat";
import { normalizeWhatsAppNumber } from "@/lib/utils/whatsapp";
import { taxProfileSchema } from "@/lib/validators/tax";

export const signupSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
  role: z.enum(["buyer", "producer"], {
    error: "Role must be either buyer or producer",
  }),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const notificationPrefsSchema = z.object({
  saleWhatsApp: z.boolean(),
  dropWhatsApp: z.boolean(),
  saleEmail: z.boolean(),
});

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(50, "Name must be at most 50 characters")
      .trim()
      .optional(),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be at most 30 characters")
      .regex(/^[a-z0-9_-]+$/, "Username: only lowercase letters, numbers, hyphens, underscores")
      .optional(),
    displayName: z
      .string()
      .max(60, "Display name must be at most 60 characters")
      .trim()
      .optional(),
    bio: z.string().max(500, "Bio must be at most 500 characters").optional(),
    genres: z
      .array(z.enum(GENRE_OPTIONS))
      .max(5, "Maximum 5 genres")
      .optional(),
    socialLinks: z
      .object({
        instagram: z.string().url().optional().or(z.literal("")),
        youtube: z.string().url().optional().or(z.literal("")),
        twitter: z.string().url().optional().or(z.literal("")),
        website: z.string().url().optional().or(z.literal("")),
        spotify: z.string().url().optional().or(z.literal("")),
        soundcloud: z.string().url().optional().or(z.literal("")),
        whatsappNumber: z
          .string()
          .optional()
          .transform((val) => {
            if (!val || !val.trim()) return "";
            return val;
          })
          .refine((val) => val === "" || normalizeWhatsAppNumber(val) !== null, {
            message: "Enter a 10-digit Indian mobile number",
          })
          .transform((val) => {
            if (!val) return "";
            return normalizeWhatsAppNumber(val) ?? "";
          }),
      })
      .optional(),
    notificationPrefs: notificationPrefsSchema.optional(),
    taxProfile: taxProfileSchema.optional(),
  })
  .refine(
    (data) => {
      if (!data.notificationPrefs?.saleWhatsApp && !data.notificationPrefs?.dropWhatsApp) {
        return true;
      }
      const number = data.socialLinks?.whatsappNumber;
      return typeof number === "string" && number.length > 0;
    },
    {
      message: "WhatsApp number is required to enable WhatsApp notifications",
      path: ["notificationPrefs", "saleWhatsApp"],
    }
  );

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
});

export const onboardingSchema = z.object({
  role: z.enum(["buyer", "producer"], {
    error: "Role must be either buyer or producer",
  }),
  inviteToken: z.string().min(1).max(128).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
