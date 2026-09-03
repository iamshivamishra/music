import { z } from "zod";

export const joinWaitlistSchema = z.object({
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters")
    .trim(),
  genres: z.array(z.string().trim()).max(5, "Maximum 5 genres").optional(),
  socialLinks: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>;
