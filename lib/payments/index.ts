import { StubPaymentProvider } from "./stub";
import type { PaymentProvider } from "./interface";

// TODO: replace with Razorpay implementation when ready.
export function getPaymentProvider(): PaymentProvider {
  return new StubPaymentProvider();
}
