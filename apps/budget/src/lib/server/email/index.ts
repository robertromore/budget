import { Resend } from "resend";
import { env } from "$env/dynamic/private";
import { logger } from "$lib/server/shared/logging";

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

/**
 * Get the Resend client instance
 * Returns null if RESEND_API_KEY is not configured
 */
function getResendClient(): Resend | null {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Send an email using Resend
 * Falls back to console logging in development when RESEND_API_KEY is not set
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResendClient();
  const from = env.EMAIL_FROM || "noreply@example.com";

  // Development mode: log to console instead of sending
  if (!resend) {
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
    const result = await resend.emails.send({
      from,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });

    if (result.error) {
      logger.error("Failed to send email:", {
        error: result.error,
        to: options.to,
        subject: options.subject,
      });

      return {
        success: false,
        error: result.error.message,
      };
    }

    logger.info("Email sent successfully:", {
      messageId: result.data?.id,
      to: options.to,
      subject: options.subject,
    });

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    logger.error("Email send error:", {
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
  return !!env.RESEND_API_KEY;
}
