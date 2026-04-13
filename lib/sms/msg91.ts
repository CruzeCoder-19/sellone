import type { SmsProvider } from "./interface";

// TODO: implement using the MSG91 REST API
// Docs: https://docs.msg91.com/reference/send-sms
export class Msg91SmsProvider implements SmsProvider {
  async send(_phone: string, _message: string): Promise<void> {
    throw new Error(
      "Msg91SmsProvider is not implemented. See https://docs.msg91.com/reference/send-sms"
    );
  }
}
