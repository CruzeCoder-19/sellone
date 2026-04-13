import type { SmsProvider } from "./interface";

export class ConsoleSmsProvider implements SmsProvider {
  async send(phone: string, message: string): Promise<void> {
    console.log(`[SMS] to ${phone}: ${message}`);
  }
}
