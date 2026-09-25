import { NextResponse } from "next/server";
import {
  sendCandidateEmail,
  sendBatchCandidateEmails,
  CandidateEmailPayload,
  EmailConfig,
  updateEmailConfig,
  getEmailConfig,
} from "@/lib/email/email-service";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { candidate, candidates, config } = body;

    // Optional config update if provided in request
    if (config?.hrEmail && config?.gmailAppPassword) {
      updateEmailConfig({
        hrEmail: config.hrEmail,
        gmailAppPassword: config.gmailAppPassword,
        senderName: config.senderName,
      });
    }

    const currentConfig = getEmailConfig();
    if (!currentConfig.hrEmail || !currentConfig.gmailAppPassword) {
      return NextResponse.json(
        {
          error:
            "HR Mail ID and Gmail Code (App Password) are not configured. Please configure them in Settings before sending emails.",
        },
        { status: 400 }
      );
    }

    // 1. Single Candidate Dispatch
    if (candidate) {
      const payload: CandidateEmailPayload = {
        candidateId: candidate.candidateId || candidate.id,
        to: candidate.to || candidate.email,
        candidateName: candidate.candidateName || candidate.name || "Candidate",
        subject: candidate.subject || "Update on your application",
        body: candidate.body || candidate.personalizedReply || "",
        jobTitle: candidate.jobTitle,
        companyName: candidate.companyName,
      };

      if (!payload.to) {
        return NextResponse.json(
          { error: "Recipient email is required." },
          { status: 400 }
        );
      }

      const result = await sendCandidateEmail(payload, config);
      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: result.error || "Failed to send email to candidate.",
            result,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Email successfully sent to ${payload.to}`,
        result,
      });
    }

    // 2. Batch Candidate Dispatch
    if (candidates && Array.isArray(candidates) && candidates.length > 0) {
      const payloads: CandidateEmailPayload[] = candidates.map((c: any) => ({
        candidateId: c.candidateId || c.id,
        to: c.to || c.email,
        candidateName: c.candidateName || c.name || "Candidate",
        subject: c.subject || "Update on your application",
        body: c.body || c.personalizedReply || "",
        jobTitle: c.jobTitle,
        companyName: c.companyName,
      }));

      const results = await sendBatchCandidateEmails(payloads, config);
      const sentCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      return NextResponse.json({
        success: true,
        total: results.length,
        sentCount,
        failedCount,
        results,
      });
    }

    return NextResponse.json(
      { error: "No candidate or candidates array provided in payload." },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("Error in /api/email/send:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred while sending candidate emails." },
      { status: 500 }
    );
  }
}

