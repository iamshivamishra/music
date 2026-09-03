import crypto from "crypto";
import { logger } from "@/lib/logger";

const BASE_URL = "https://api.razorpay.com/v1";

function getAuth(): string {
  const keyId = process.env.RAZORPAYX_KEY_ID;
  const keySecret = process.env.RAZORPAYX_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("RAZORPAYX_KEY_ID and RAZORPAYX_KEY_SECRET must be set");
  }
  return Buffer.from(`${keyId}:${keySecret}`).toString("base64");
}

function getAccountNumber(): string {
  const acct = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  if (!acct) throw new Error("RAZORPAYX_ACCOUNT_NUMBER must be set");
  return acct;
}

async function rpxFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${getAuth()}`,
      ...options.headers,
    },
  });

  const body = await res.json();
  if (!res.ok) {
    logger.error("RazorpayX API error", { path, status: res.status, body });
    throw new Error(body.error?.description ?? `RazorpayX request failed: ${res.status}`);
  }
  return body as T;
}

interface RazorpayXContact {
  id: string;
  entity: string;
  name: string;
  email?: string;
}

interface RazorpayXFundAccount {
  id: string;
  entity: string;
  contact_id: string;
}

interface RazorpayXPayout {
  id: string;
  entity: string;
  fund_account_id: string;
  amount: number;
  currency: string;
  status: string;
  utr?: string;
}

export const razorpayx = {
  async createContact(name: string, email: string): Promise<RazorpayXContact> {
    return rpxFetch<RazorpayXContact>("/contacts", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        type: "vendor",
      }),
    });
  },

  async createUpiFundAccount(contactId: string, upiId: string): Promise<RazorpayXFundAccount> {
    return rpxFetch<RazorpayXFundAccount>("/fund_accounts", {
      method: "POST",
      body: JSON.stringify({
        contact_id: contactId,
        account_type: "vpa",
        vpa: { address: upiId },
      }),
    });
  },

  async createBankFundAccount(
    contactId: string,
    bankDetails: { accountNumber: string; ifsc: string; accountName: string }
  ): Promise<RazorpayXFundAccount> {
    return rpxFetch<RazorpayXFundAccount>("/fund_accounts", {
      method: "POST",
      body: JSON.stringify({
        contact_id: contactId,
        account_type: "bank_account",
        bank_account: {
          name: bankDetails.accountName,
          ifsc: bankDetails.ifsc,
          account_number: bankDetails.accountNumber,
        },
      }),
    });
  },

  async createPayout(
    fundAccountId: string,
    amountPaise: number,
    purpose: string = "payout",
    referenceId?: string
  ): Promise<RazorpayXPayout> {
    return rpxFetch<RazorpayXPayout>("/payouts", {
      method: "POST",
      body: JSON.stringify({
        account_number: getAccountNumber(),
        fund_account_id: fundAccountId,
        amount: amountPaise,
        currency: "INR",
        mode: "IMPS",
        purpose,
        queue_if_low_balance: true,
        reference_id: referenceId,
      }),
    });
  },

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = process.env.RAZORPAYX_WEBHOOK_SECRET;
    if (!secret) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signature);
    if (expectedBuf.length !== receivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  },
};
