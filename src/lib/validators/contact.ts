import { z } from "zod";

export const contactSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .trim(),
  email: z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),
  subject: z
    .string()
    .min(2, "Subject must be at least 2 characters")
    .max(200, "Subject must be at most 200 characters")
    .trim(),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be at most 2000 characters")
    .trim(),
});

export type ContactInput = z.infer<typeof contactSchema>;
