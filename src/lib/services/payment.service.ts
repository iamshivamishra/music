import { paymentCheckoutService } from "./payment-checkout.service";
import { offerCheckoutService } from "./offer-checkout.service";
import { paymentVerifyService } from "./payment-verify.service";
import { paymentRefundService } from "./payment-refund.service";

export { paymentCheckoutService } from "./payment-checkout.service";
export { offerCheckoutService } from "./offer-checkout.service";
export { paymentVerifyService, type RazorpayWebhookEvent } from "./payment-verify.service";
export { paymentRefundService } from "./payment-refund.service";

/**
 * Combined facade for backward compatibility.
 * Existing code can continue importing `paymentService` from this module.
 */
export const paymentService = {
  ...paymentCheckoutService,
  ...offerCheckoutService,
  ...paymentVerifyService,
  ...paymentRefundService,
};
