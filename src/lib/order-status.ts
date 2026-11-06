export type OrderTone = "info" | "error" | "success";

// Customer-facing wording for an order, derived only from what we stored from
// Razorpay-verified payments and webhooks, never from URL parameters. `next` picks the actions
// the order page offers.
export function describeOrder(o: { status: string; paymentStatus: string }): {
  label: string;
  note: string;
  tone: OrderTone;
  next: "shop" | "retry" | "refresh" | "none";
} {
  switch (o.status) {
    case "confirmed":
      return { label: "Paid", note: "Payment received. Thank you for your order.", tone: "success", next: "shop" };
    case "pending":
      return {
        label: "Awaiting payment",
        note: "We haven't received confirmation of payment yet. If you've just paid, check again in a moment.",
        tone: "info",
        next: "refresh",
      };
    case "expired":
      return {
        label: "Expired",
        note: "Checkout wasn't completed in time and no payment was taken.",
        tone: "info",
        next: "retry",
      };
    case "canceled":
      return {
        label: o.paymentStatus === "failed" ? "Payment failed" : "Canceled",
        note: "No payment was taken for this order.",
        tone: o.paymentStatus === "failed" ? "error" : "info",
        next: "retry",
      };
    case "needs_review":
      return {
        label: o.paymentStatus === "refunded" ? "Refunded" : "Under review",
        note:
          o.paymentStatus === "refunded"
            ? "We couldn't fulfil this order and your payment has been refunded."
            : "There was a problem with this order. We're looking into it and will be in touch.",
        tone: o.paymentStatus === "refunded" ? "info" : "error",
        next: o.paymentStatus === "refunded" ? "shop" : "none",
      };
    default:
      return { label: o.status, note: "", tone: "info", next: "none" };
  }
}
