import { NextResponse } from "next/server";
import { testSmtpConnection, updateEmailConfig } from "@/lib/email/email-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { hrEmail, gmailAppPassword, senderName, testRecipient } = body;

    if (!hrEmail || !gmailAppPassword) {
      return NextResponse.json(
        {
          error:
            "HR Mail ID and Gmail Code (App Password) are required to test connection.",
        },
        { status: 400 }
      );
    }

    const testConfig = {
      hrEmail: String(hrEmail).trim(),
      gmailAppPassword: String(gmailAppPassword).trim(),
      senderName: senderName ? String(senderName).trim() : "Talent Acquisition Team",
      smtpHost: "smtp.gmail.com",
      smtpPort: 465,
    };

    const result = await testSmtpConnection(testConfig, testRecipient);

    if (result.success) {
      // Sync with active config
      updateEmailConfig(testConfig);
      return NextResponse.json({
        success: true,
        message: result.message,
        config: {
          hrEmail: testConfig.hrEmail,
          senderName: testConfig.senderName,
          verified: true,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
        },
        { status: 422 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Failed to execute SMTP connection test.",
      },
      { status: 500 }
    );
  }
}

