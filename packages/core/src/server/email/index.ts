import { Resend } from "resend";
import { Client as MailjetClient, type SendEmailV3_1, type LibraryResponse } from "node-mailjet";
import { getEnv } from "$core/server/env";
import { logger } from "$core/server/shared/logging";

/**
 * Email send options
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Email send result
 */
export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

type EmailProvider = "resend" | "mailjet" | "none";

/**
 * Detect which email provider is configured
 */
function detectProvider(): EmailProvider {
  if (getEnv("RESEND_API_KEY")) return "resend";
  if (getEnv("MAILJET_API_KEY") && getEnv("MAILJET_SECRET_KEY")) return "mailjet";
  return "none";
}

/**
 * Send via Resend
 */
async function sendViaResend(options: SendEmailOptions, from: string): Promise<SendEmailResult> {
  const resend = new Resend(getEnv("RESEND_API_KEY"));

  const result = await resend.emails.send({
    from,
    to: Array.isArray(options.to) ? options.to : [options.to],
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
  });

  if (result.error) {
    return { success: false, error: result.error.message };
  }

  return { success: true, messageId: result.data?.id };
}

/**
 * Send via Mailjet
 */
async function sendViaMailjet(options: SendEmailOptions, from: string): Promise<SendEmailResult> {
  const mailjet = new MailjetClient({
    apiKey: getEnv("MAILJET_API_KEY")!,
    apiSecret: getEnv("MAILJET_SECRET_KEY")!,
  });

  const recipients = Array.isArray(options.to) ? options.to : [options.to];

  const data: SendEmailV3_1.Body = {
    Messages: [
      {
        From: { Email: from },
        To: recipients.map((email) => ({ Email: email })),
        Subject: options.subject,
        HTMLPart: options.html,
        TextPart: options.text || "",
      },
    ],
  };

  const result: LibraryResponse<SendEmailV3_1.Response> = await mailjet
    .post("send", { version: "v3.1" })
    .request(data);

  const message = result.body.Messages[0];
  if (message.Status === "success") {
    return { success: true, messageId: String(message.To[0]?.MessageID ?? "") };
  }

  return { success: false, error: `Mailjet status: ${message.Status}` };
}

/**
 * Send an email using the configured provider (Resend or Mailjet).
 * Falls back to console logging when no provider is configured.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const provider = detectProvider();
  const from = getEnv("EMAIL_FROM") || "noreply@example.com";

  if (provider === "none") {
    logger.info("[DEV EMAIL] Would send email:", {
      from,
      to: options.to,
      subject: options.subject,
      preview: options.html.substring(0, 200) + "...",
    });

    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    };
  }

  try {
    const result = provider === "mailjet"
      ? await sendViaMailjet(options, from)
      : await sendViaResend(options, from);

    if (result.success) {
      logger.info(`Email sent via ${provider}:`, {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
      });
    } else {
      logger.error(`Failed to send email via ${provider}:`, {
        error: result.error,
        to: options.to,
        subject: options.subject,
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error(`Email send error (${provider}):`, {
      error: errorMessage,
      to: options.to,
      subject: options.subject,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if email service is configured for production
 */
export function isEmailConfigured(): boolean {
  return detectProvider() !== "none";
}
