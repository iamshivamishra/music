import { z } from "zod";
import { GENRE_OPTIONS } from "@/lib/validators/beat";

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

export const updateProfileSchema = z.object({
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
    })
    .optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
