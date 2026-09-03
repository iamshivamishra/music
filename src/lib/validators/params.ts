import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");
export const slugSchema = z.string().regex(/^[a-z0-9-]+$/, "Invalid slug format").min(1).max(200);
export const tokenSchema = z.string().min(1).max(500);
