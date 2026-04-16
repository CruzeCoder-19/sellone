export interface PaymentProvider {
  createIntent(args: {
    amountInPaise: number;
    orderNumber: string;
    customerId: string;
  }): Promise<{
    providerOrderId: string;
    providerPayload: Record<string, unknown>;
  }>;
}
