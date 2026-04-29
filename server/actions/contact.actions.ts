"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/email";

type ActionResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().max(30).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export async function submitContactForm(
  input: z.input<typeof schema>,
): Promise<ActionResult> {
  try {
    const data = schema.parse(input);
    const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER || "admin@wolsell.local";

    const html = `
      <h2>New contact form submission</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      ${data.phone ? `<p><strong>Phone:</strong> ${data.phone}</p>` : ""}
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap;">${data.message}</p>
    `;

    // Fire-and-forget: log error but always return success so users aren't blocked.
    sendEmail(to, `New contact form: ${data.name}`, html).catch((err) => {
      console.error("[contact email failed]", err);
    });

    return { ok: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "Validation error" };
    console.error("[submitContactForm]", err);
    return { ok: false, error: "Submission failed. Please try again." };
  }
}
