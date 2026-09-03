import { z } from "zod";

export const requestPayoutSchema = z
  .object({
    method: z.enum(["upi", "bank_transfer"]),
    amount: z.number().min(100, "Minimum payout is ₹100"),
    upiId: z.string().min(3).optional(),
    bankDetails: z
      .object({
        accountNumber: z.string().min(8, "Invalid account number"),
        ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
        accountName: z.string().min(2, "Account name is required"),
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.method === "upi") return !!data.upiId;
      if (data.method === "bank_transfer") return !!data.bankDetails;
      return false;
    },
    { message: "UPI ID is required for UPI payouts; bank details are required for bank transfers" }
  );

export const adminProcessPayoutSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().max(500).optional(),
});

export type RequestPayoutInput = z.infer<typeof requestPayoutSchema>;
export type AdminProcessPayoutInput = z.infer<typeof adminProcessPayoutSchema>;
