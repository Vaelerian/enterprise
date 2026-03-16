import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "noreply@enterprise.coria.app";

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM_EMAIL, to: email,
    subject: "Verify your email - Enterprise",
    html: `<h2>Verify your email</h2><p>Click the link below to verify your email address:</p><p><a href="${verifyUrl}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM_EMAIL, to: email,
    subject: "Reset your password - Enterprise",
    html: `<h2>Reset your password</h2><p>Click the link below to reset your password:</p><p><a href="${resetUrl}">Reset Password</a></p><p>This link expires in 1 hour.</p>`,
  });
}

export async function sendInvitationEmail(email: string, orgName: string, inviterName: string, token: string): Promise<void> {
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register?invitation=${token}`;
  await resend.emails.send({
    from: FROM_EMAIL, to: email,
    subject: `You've been invited to ${orgName} - Enterprise`,
    html: `<h2>You've been invited</h2><p>${inviterName} has invited you to join <strong>${orgName}</strong> on Enterprise.</p><p><a href="${acceptUrl}">Accept Invitation</a></p><p>This invitation expires in 7 days.</p>`,
  });
}
