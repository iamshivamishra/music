import { paymentService } from "@/lib/services/payment.service";
import { userRepository } from "@/lib/repositories/user.repository";
import { renderReceiptPdf } from "@/lib/pdf/receipt-template";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const receiptService = {
  async generateForBuyer(
    orderId: string,
    buyerId: string
  ): Promise<{ buffer: Buffer; filename: string }> {
    const order = await paymentService.getOrderForBuyer(orderId, buyerId);
    if (!order) throw new NotFoundError("Order");
    if (order.status !== "paid") {
      throw new ValidationError("Receipt is only available for paid orders");
    }

    const buyer = await userRepository.findById(buyerId);
    const buffer = await renderReceiptPdf({
      order,
      buyerName: buyer?.displayName || buyer?.name || "Customer",
      buyerEmail: buyer?.email || "",
    });

    return {
      buffer,
      filename: `receipt-${order.receipt}.pdf`,
    };
  },
};
