import type { PaymentProvider } from "./interface";

export class StubPaymentProvider implements PaymentProvider {
  async createIntent({
    amountInPaise,
    orderNumber,
    customerId,
  }: {
    amountInPaise: number;
    orderNumber: string;
    customerId: string;
  }) {
    console.log(
      `[StubPaymentProvider] createIntent — orderNumber=${orderNumber} amount=${amountInPaise / 100} customerId=${customerId}`,
    );
    return {
      providerOrderId: `stub_${orderNumber}`,
      providerPayload: {},
    };
  }
}
