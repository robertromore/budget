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
  const {
    workspaceName,
    inviterName,
    role,
    acceptUrl,
    message,
    expiresInDays = 7,
  } = options;

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
 * Email template for welcome email after signup
 */
export function welcomeEmail(options: {
  userName: string;
  loginUrl: string;
}): { subject: string; html: string; text: string } {
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
