import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await context.params;

    const job = await prisma.jobProfile.findUnique({
      where: { id: jobId },
      include: {
        candidates: {
          include: {
            roundResults: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job profile not found." }, { status: 404 });
    }

    const shortlisted = job.candidates.filter((c) => c.status === "SHORTLISTED");
    const notShortlisted = job.candidates.filter((c) => c.status !== "SHORTLISTED");

    // Sheet 1: Shortlisted candidates
    const shortlistedRows = shortlisted.map((c, idx) => {
      const result = c.roundResults[0];
      return {
        "Rank": idx + 1,
        "Student Email ID": c.email,
        "Candidate Name": c.name,
        "Experience (Years)": c.experienceYears,
        "Match Score (%)": result?.score ?? 80,
        "Status": "SHORTLISTED",
        "Promotion Note": c.isOverridden ? `HR Manual Override (${c.overrideReason || "Approved"})` : "AI Qualified (>= 50% Match / Benchmark Top Tier)",
        "Screening Date": c.createdAt.toISOString().replace("T", " ").slice(0, 19),
      };
    });

    // Sheet 2: Not Shortlisted candidates with Email Body Text
    const notShortlistedRows = notShortlisted.map((c, idx) => {
      const result = c.roundResults[0];
      return {
        "Rank": idx + 1,
        "Student Email ID": c.email,
        "Candidate Name": c.name,
        "Experience (Years)": c.experienceYears,
        "Match Score (%)": result?.score ?? 35,
        "Status": "NOT SHORTLISTED",
        "Feedback Summary": result?.feedback || "Did not fulfill 50% core requirement threshold",
        "Mail Body Text (For Rejection Feedback)": c.personalizedReply || "Thank you for applying. Currently your profile did not meet the core technical thresholds for this role.",
        "Screening Date": c.createdAt.toISOString().replace("T", " ").slice(0, 19),
      };
    });

    const wb = XLSX.utils.book_new();

    const wsShortlisted = XLSX.utils.json_to_sheet(
      shortlistedRows.length > 0
        ? shortlistedRows
        : [{ "Message": "No candidates currently shortlisted" }]
    );
    XLSX.utils.book_append_sheet(wb, wsShortlisted, "Shortlisted");

    const wsNotShortlisted = XLSX.utils.json_to_sheet(
      notShortlistedRows.length > 0
        ? notShortlistedRows
        : [{ "Message": "No candidates currently in not shortlisted pool" }]
    );
    XLSX.utils.book_append_sheet(wb, wsNotShortlisted, "Not Shortlisted");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const safeTitle = job.title.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${safeTitle}_Screening_Report.xlsx`;

    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error("Error generating Excel report:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate Excel report." },
      { status: 500 }
    );
  }
}

