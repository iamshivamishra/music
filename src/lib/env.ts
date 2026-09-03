import { z } from "zod";

const envSchema = z.object({
  // App
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_GTM_ID: z.string().optional(),
  NEXT_PUBLIC_GSC_VERIFICATION: z.string().optional(),

  // Auth
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),

  // Database
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  ALLOW_NON_TRANSACTIONAL_FALLBACK: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  // Payments (Razorpay)
  RAZORPAY_KEY_ID: z.string().min(1, "RAZORPAY_KEY_ID is required"),
  RAZORPAY_KEY_SECRET: z.string().min(1, "RAZORPAY_KEY_SECRET is required"),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional(),

  // Producer Payouts (RazorpayX)
  PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(10),
  PAYOUT_AUTO_APPROVE_LIMIT: z.coerce.number().nonnegative().default(50000),
  RAZORPAYX_KEY_ID: z.string().optional(),
  RAZORPAYX_KEY_SECRET: z.string().optional(),
  RAZORPAYX_ACCOUNT_NUMBER: z.string().optional(),
  RAZORPAYX_WEBHOOK_SECRET: z.string().optional(),

  // AWS S3 Storage
  AWS_S3_REGION: z.string().min(1).default("ap-south-1"),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
  AWS_S3_BUCKET: z.string().min(1, "AWS_S3_BUCKET is required"),
  AWS_S3_PUBLIC_URL: z.string().url().optional(),

  // Email (Resend)
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  RESEND_FROM_EMAIL: z.string().email().default("noreply@yourdomain.com"),
  CONTACT_TO_EMAIL: z.string().email().optional(),
  SUPPORT_EMAIL: z.string().email().default("support@trishulbeats.com"),

  // GST / Invoice (optional)
  PLATFORM_GSTIN: z.string().optional(),
  PLATFORM_LEGAL_NAME: z.string().optional(),
  PLATFORM_ADDRESS: z.string().optional(),
  GST_RATE: z.coerce.number().int().min(0).max(100).default(18),

  // License verification
  HMAC_LICENSE_SECRET: z.string().optional(),
});

// Only validate on server
export const env = envSchema.parse(process.env);
