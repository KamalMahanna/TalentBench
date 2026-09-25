import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

export interface EmailConfig {
  hrEmail: string;
  gmailAppPassword: string;
  senderName?: string;
  smtpHost?: string;
  smtpPort?: number;
}

// Module-level in-memory email configuration
let activeEmailConfig: EmailConfig = {
  hrEmail: process.env.HR_EMAIL || process.env.SMTP_USER || "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || "",
  senderName: process.env.SENDER_NAME || "Talent Acquisition Team",
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT) || 465,
};

/**
 * Cleans user-provided Gmail app password (removes whitespace & formatting spaces)
 * Google often presents app passwords as 4 chunks of 4 characters: "abcd efgh ijkl mnop"
 */
export function cleanGmailCode(code: string): string {
  if (!code) return "";
  return code.replace(/\s+/g, "").trim();
}

export function updateEmailConfig(config: Partial<EmailConfig>) {
  activeEmailConfig = {
    ...activeEmailConfig,
    ...config,
    ...(config.gmailAppPassword ? { gmailAppPassword: cleanGmailCode(config.gmailAppPassword) } : {}),
  };
}

export function getEmailConfig(): EmailConfig {
  return { ...activeEmailConfig };
}

/**
 * Creates a Nodemailer transporter configured for Gmail SMTP
 */
export function createGmailTransporter(customConfig?: Partial<EmailConfig>) {
  const config = {
    ...activeEmailConfig,
    ...customConfig,
  };

  const hrEmail = config.hrEmail?.trim();
  const password = cleanGmailCode(config.gmailAppPassword || "");

  if (!hrEmail || !password) {
    throw new Error(
      "HR Email ID or Gmail App Password is not configured. Please configure your credentials in Settings."
    );
  }

  const port = Number(config.smtpPort) || 465;
  const isSecure = port === 465;

  return nodemailer.createTransport({
    host: config.smtpHost || "smtp.gmail.com",
    port,
    secure: isSecure,
    auth: {
      user: hrEmail,
      pass: password,
    },
    tls: {
      rejectUnauthorized: false, // Prevents self-signed certificate rejection in some corporate networks
    },
  });
}

/**
 * Tests the Gmail SMTP connection
 */
export async function testSmtpConnection(
  customConfig?: Partial<EmailConfig>,
  testRecipient?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const config = {
      ...activeEmailConfig,
      ...customConfig,
    };

    const transporter = createGmailTransporter(config);
    await transporter.verify();

    // If test recipient requested, send a small verification email
    const recipient = testRecipient || config.hrEmail;
    if (recipient) {
      const senderName = config.senderName || "TalentBench Verification";
      await transporter.sendMail({
        from: `"${senderName}" <${config.hrEmail.trim()}>`,
        to: recipient.trim(),
        subject: "TalentBench - SMTP Connection Test Successful",
        text: `Hello,\n\nThis is a verification email from TalentBench. Your Gmail App Password and HR Email ID (${config.hrEmail}) have been successfully validated!\n\nTimestamp: ${new Date().toLocaleString()}\n\nBest regards,\nTalentBench System`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #0f172a; margin: 0; font-size: 20px;">TalentBench SMTP Connection Verified</h2>
              <span style="display: inline-block; margin-top: 8px; padding: 4px 12px; background: #dcfce7; color: #15803d; border-radius: 9999px; font-size: 12px; font-weight: 600;">Active & Ready</span>
            </div>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
              Hello,<br><br>
              Your HR Gmail sender configuration for <strong>${config.hrEmail}</strong> has been successfully verified! You can now send automated and customized candidate emails directly from your inbox.
            </p>
            <div style="margin-top: 20px; padding: 12px 16px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 12px; color: #64748b;">
              Verified at: ${new Date().toISOString()}
            </div>
          </div>
        `,
      });
    }

    return {
      success: true,
      message: `Connection successfully established with Gmail SMTP for ${config.hrEmail}`,
    };
  } catch (err: any) {
    let errorMsg = err.message || "Failed to connect to SMTP server.";
    if (errorMsg.includes("Invalid login") || errorMsg.includes("535") || errorMsg.includes("BadCredentials")) {
      errorMsg =
        "Invalid Gmail credentials. Please verify your HR Mail ID and make sure you are using a 16-character Google App Password (not your regular Gmail password). Ensure 2-Step Verification is enabled on your Google Account.";
    }
    return {
      success: false,
      message: errorMsg,
    };
  }
}

/**
 * Builds a styled, responsive HTML email template
 */
export function buildEmailHtml(params: {
  candidateName: string;
  body: string;
  companyName?: string;
  jobTitle?: string;
  senderName?: string;
}): string {
  const { candidateName, body, companyName = "TalentBench", jobTitle, senderName } = params;

  // Convert double/single newlines to paragraphs
  const formattedBody = body
    .split("\n\n")
    .map(
      (para) =>
        `<p style="margin: 0 0 16px 0; color: #334155; font-size: 14px; line-height: 1.6;">${para.replace(
          /\n/g,
          "<br>"
        )}</p>`
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Update on your application</title>
      </head>
      <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <div style="background: #0f172a; padding: 28px 32px; border-bottom: 2px solid #3b82f6;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="color: #60a5fa; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;">
                ${companyName} · Talent Acquisition
              </span>
            </div>
            ${
              jobTitle
                ? `<h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 10px 0 0 0; letter-spacing: -0.01em;">Requisition: ${jobTitle}</h1>`
                : `<h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 10px 0 0 0;">Application Update</h1>`
            }
          </div>

          <!-- Main Body -->
          <div style="padding: 32px;">
            ${formattedBody}

            <!-- Signature block -->
            <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #0f172a;">
                ${senderName || companyName + " Recruitment Team"}
              </p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">
                ${companyName}
              </p>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8;">
              This email was dispatched via TalentBench Autonomous Recruitment Gateway. Please do not reply directly to automated communications.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export interface CandidateEmailPayload {
  candidateId?: string;
  to: string;
  candidateName: string;
  subject: string;
  body: string;
  jobTitle?: string;
  companyName?: string;
}

export interface SendResult {
  candidateId?: string;
  to: string;
  candidateName: string;
  success: boolean;
  sentAt?: string;
  error?: string;
}

/**
 * Sends an email to an individual candidate and updates their DB record if candidateId is provided
 */
export async function sendCandidateEmail(
  payload: CandidateEmailPayload,
  customConfig?: Partial<EmailConfig>
): Promise<SendResult> {
  const config = {
    ...activeEmailConfig,
    ...customConfig,
  };

  const senderName = config.senderName || "Talent Acquisition Team";
  const hrEmail = config.hrEmail?.trim();

  if (!hrEmail) {
    return {
      candidateId: payload.candidateId,
      to: payload.to,
      candidateName: payload.candidateName,
      success: false,
      error: "HR Mail ID not configured in Settings.",
    };
  }

  try {
    const transporter = createGmailTransporter(config);
    const html = buildEmailHtml({
      candidateName: payload.candidateName,
      body: payload.body,
      companyName: payload.companyName || "TalentBench",
      jobTitle: payload.jobTitle,
      senderName,
    });

    await transporter.sendMail({
      from: `"${senderName}" <${hrEmail}>`,
      to: payload.to.trim(),
      subject: payload.subject,
      text: payload.body,
      html,
    });

    const sentAt = new Date().toISOString();

    // If candidateId exists in Prisma, update status
    if (payload.candidateId) {
      try {
        await prisma.candidate.update({
          where: { id: payload.candidateId },
          data: {
            emailStatus: "SENT",
            emailSentAt: new Date(),
            emailError: null,
          },
        });
      } catch (dbErr) {
        console.warn(`Could not update DB candidate ${payload.candidateId}:`, dbErr);
      }
    }

    return {
      candidateId: payload.candidateId,
      to: payload.to,
      candidateName: payload.candidateName,
      success: true,
      sentAt,
    };
  } catch (err: any) {
    const errorMsg = err.message || "Failed to dispatch email.";

    // If candidateId exists in Prisma, record failure
    if (payload.candidateId) {
      try {
        await prisma.candidate.update({
          where: { id: payload.candidateId },
          data: {
            emailStatus: "FAILED",
            emailError: errorMsg,
          },
        });
      } catch (dbErr) {
        console.warn(`Could not update DB candidate ${payload.candidateId} failure:`, dbErr);
      }
    }

    return {
      candidateId: payload.candidateId,
      to: payload.to,
      candidateName: payload.candidateName,
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Sends emails to a batch of candidates with rate throttling
 */
export async function sendBatchCandidateEmails(
  payloads: CandidateEmailPayload[],
  customConfig?: Partial<EmailConfig>,
  onProgress?: (index: number, total: number, result: SendResult) => void
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    const result = await sendCandidateEmail(payload, customConfig);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, payloads.length, result);
    }

    // Add 250ms spacing between sends to stay well within Gmail sending rate limits
    if (i < payloads.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return results;
}

