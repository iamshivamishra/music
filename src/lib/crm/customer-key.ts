import { createHash } from "crypto";
import { CUSTOMER_KEY_PATTERN } from "@/lib/validators/crm";
import { ValidationError } from "@/lib/errors";

export type ParsedCustomerKey =
  | { type: "user"; buyerId: string }
  | { type: "email"; hash: string };

export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function parseCustomerKey(key: string): ParsedCustomerKey {
  if (!CUSTOMER_KEY_PATTERN.test(key)) {
    throw new ValidationError("Invalid customer key");
  }
  if (key.startsWith("user:")) {
    return { type: "user", buyerId: key.slice(5).toLowerCase() };
  }
  return { type: "email", hash: key.slice(6).toLowerCase() };
}

export function toCustomerKey(buyerId: string | null, email: string | null): string {
  if (buyerId) return `user:${buyerId}`;
  if (email) return `email:${hashEmail(email)}`;
  throw new ValidationError("Cannot build customer key without identity");
}
