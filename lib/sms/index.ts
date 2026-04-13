import type { SmsProvider } from "./interface";
import { ConsoleSmsProvider } from "./console";
import { Msg91SmsProvider } from "./msg91";

export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER ?? "console";
  if (provider === "msg91") return new Msg91SmsProvider();
  return new ConsoleSmsProvider();
}
