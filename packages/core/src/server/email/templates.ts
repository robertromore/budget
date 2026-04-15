/**
 * Email template for password reset
 */
export function passwordResetEmail(options: {
  resetUrl: string;
  userName?: string;
  expiresInMinutes?: number;
}): { subject: string; html: string; text: string } {
  const { resetUrl, userName, expiresInMinutes = 60 } = options;
  const greeting = userName ? `Hi ${userName},` : "Hi,";

  return {
    subject: "Reset your password",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">Reset Your Password</h1>

        <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #3f3f46;">${greeting}</p>

        <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
          We received a request to reset your password. Click the button below to create a new password:
        </p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 0 0 24px;">
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 500; color: #ffffff; background-color: #18181b; border-radius: 6px; text-decoration: none;">
                Reset Password
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #71717a;">
          This link will expire in ${expiresInMinutes} minutes. If you didn't request a password reset, you can safely ignore this email.
        </p>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e4e4e7;">

        <p style="margin: 0; font-size: 12px; line-height: 18px; color: #a1a1aa;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `
${greeting}

We received a request to reset your password. Visit the link below to create a new password:

${resetUrl}

This link will expire in ${expiresInMinutes} minutes. If you didn't request a password reset, you can safely ignore this email.
    `.trim(),
  };
}

/**
 * Email template for workspace invitation
 */
export function workspaceInvitationEmail(options: {
  workspaceName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
  message?: string;
  expiresInDays?: number;
}): { subject: string; html: string; text: string } {
  const { workspaceName, inviterName, role, acceptUrl, message, expiresInDays = 7 } = options;

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  return {
    subject: `You've been invited to ${workspaceName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workspace Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">Workspace Invitation</h1>

        <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #3f3f46;">
          <strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> as a <strong>${roleLabel}</strong>.
        </p>

        ${
          message
            ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
          <tr>
            <td style="padding: 16px; background-color: #f4f4f5; border-radius: 6px; border-left: 4px solid #3b82f6;">
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #3f3f46; font-style: italic;">
                "${message}"
              </p>
            </td>
          </tr>
        </table>
        `
            : ""
        }

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 0 0 24px;">
              <a href="${acceptUrl}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 500; color: #ffffff; background-color: #18181b; border-radius: 6px; text-decoration: none;">
                Accept Invitation
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #71717a;">
          This invitation will expire in ${expiresInDays} days. If you don't want to join this workspace, you can ignore this email.
        </p>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e4e4e7;">

        <p style="margin: 0; font-size: 12px; line-height: 18px; color: #a1a1aa;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${acceptUrl}" style="color: #3b82f6; word-break: break-all;">${acceptUrl}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `
${inviterName} has invited you to join ${workspaceName} as a ${roleLabel}.

${message ? `"${message}"\n` : ""}
Accept the invitation by visiting:
${acceptUrl}

This invitation will expire in ${expiresInDays} days. If you don't want to join this workspace, you can ignore this email.
    `.trim(),
  };
}

/**
 * Email template for email verification
 */
export function emailVerificationEmail(options: {
  verifyUrl: string;
  userName?: string;
  expiresInMinutes?: number;
}): { subject: string; html: string; text: string } {
  const { verifyUrl, userName, expiresInMinutes = 1440 } = options; // 1440 = 24 hours
  const greeting = userName ? `Hi ${userName},` : "Hi,";
  const expiresInHours = Math.round(expiresInMinutes / 60);

  return {
    subject: "Verify your email address",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">Verify Your Email</h1>

        <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #3f3f46;">${greeting}</p>

        <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
          Please verify your email address by clicking the button below:
        </p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 0 0 24px;">
              <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 500; color: #ffffff; background-color: #18181b; border-radius: 6px; text-decoration: none;">
                Verify Email
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #71717a;">
          This link will expire in ${expiresInHours} hours. If you didn't create an account, you can safely ignore this email.
        </p>

        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e4e4e7;">

        <p style="margin: 0; font-size: 12px; line-height: 18px; color: #a1a1aa;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verifyUrl}" style="color: #3b82f6; word-break: break-all;">${verifyUrl}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `
${greeting}

Please verify your email address by visiting the link below:

${verifyUrl}

This link will expire in ${expiresInHours} hours. If you didn't create an account, you can safely ignore this email.
    `.trim(),
  };
}

/**
 * Email template for welcome email after signup
 */
export function welcomeEmail(options: { userName: string; loginUrl: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const { userName, loginUrl } = options;

  return {
    subject: "Welcome to Budget App!",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">Welcome, ${userName}!</h1>

        <p style="margin: 0 0 16px; font-size: 16px; line-height: 24px; color: #3f3f46;">
          Thanks for signing up! Your account is ready to use.
        </p>

        <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
          Get started by setting up your first budget and tracking your finances.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 0 0 24px;">
              <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; font-size: 16px; font-weight: 500; color: #ffffff; background-color: #18181b; border-radius: 6px; text-decoration: none;">
                Go to Dashboard
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; font-size: 14px; line-height: 20px; color: #71717a;">
          If you have any questions, feel free to reach out. We're here to help!
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `
Welcome, ${userName}!

Thanks for signing up! Your account is ready to use.

Get started by setting up your first budget and tracking your finances.

Go to Dashboard: ${loginUrl}

If you have any questions, feel free to reach out. We're here to help!
    `.trim(),
  };
}

/**
 * Email template for price watcher alerts
 */
export function priceAlertEmail(options: {
  productName: string;
  reason: string;
  alertType: string;
  currentPrice?: number | null;
  productUrl?: string;
  appUrl?: string;
}): { subject: string; html: string; text: string } {
  const { productName, reason, alertType, currentPrice, productUrl, appUrl } = options;

  const typeLabel: Record<string, string> = {
    price_drop: "Price Drop",
    target_reached: "Target Reached",
    back_in_stock: "Back in Stock",
    any_change: "Price Change",
  };

  const subject = `${typeLabel[alertType] ?? "Price Alert"}: ${productName}`;

  const priceHtml = currentPrice !== null && currentPrice !== undefined
    ? `<p style="margin: 0 0 16px; font-size: 28px; font-weight: 700; color: #18181b;">$${currentPrice.toFixed(2)}</p>`
    : "";

  const productLink = productUrl
    ? `<a href="${productUrl}" style="display: inline-block; padding: 10px 20px; font-size: 14px; font-weight: 500; color: #ffffff; background-color: #18181b; border-radius: 6px; text-decoration: none; margin-right: 8px;">View Product</a>`
    : "";

  const dashboardLink = appUrl
    ? `<a href="${appUrl}/price-watcher" style="display: inline-block; padding: 10px 20px; font-size: 14px; font-weight: 500; color: #18181b; background-color: #f4f4f5; border-radius: 6px; text-decoration: none; border: 1px solid #e4e4e7;">Open Dashboard</a>`
    : "";

  return {
    subject,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td style="background-color: #ffffff; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa;">${typeLabel[alertType] ?? "Price Alert"}</p>

        <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #18181b;">${productName}</h1>

        ${priceHtml}

        <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
          ${reason}
        </p>

        <table cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 0 0 24px;">
              ${productLink}
              ${dashboardLink}
            </td>
          </tr>
        </table>

        <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
          You received this because you have a price alert configured for this product.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
    text: `
${typeLabel[alertType] ?? "Price Alert"}: ${productName}

${currentPrice !== null && currentPrice !== undefined ? `Current Price: $${currentPrice.toFixed(2)}` : ""}

${reason}

${productUrl ? `View Product: ${productUrl}` : ""}
${appUrl ? `Dashboard: ${appUrl}/price-watcher` : ""}
    `.trim(),
  };
}
