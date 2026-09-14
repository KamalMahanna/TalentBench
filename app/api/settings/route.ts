import { NextResponse } from "next/server";
import { updateGatewayConfig, getGatewayConfig } from "@/lib/ai/llm-gateway";

// In-memory / persisted default configuration settings
let settingsStore = {
  org: {
    name: "Vanguard Systems",
    domain: "vanguard.io",
    seatsTotal: 10,
    seatsUsed: 4,
    careerWebhook: "https://api.vanguard.io/webhooks/talentbench-ingest",
  },
  members: [
    {
      id: "m-1",
      name: "Alexandra Sterling",
      email: "alexandra@vanguard.io",
      role: "admin",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80",
      status: "active",
      joinedAt: "2026-01-15",
    },
    {
      id: "m-2",
      name: "Marcus Vance",
      email: "marcus.v@vanguard.io",
      role: "recruiter",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
      status: "active",
      joinedAt: "2026-02-01",
    },
    {
      id: "m-3",
      name: "Sophia Chen",
      email: "sophia.chen@vanguard.io",
      role: "recruiter",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
      status: "active",
      joinedAt: "2026-03-10",
    },
    {
      id: "m-4",
      name: "Tariq Al-Mansoor",
      email: "tariq@vanguard.io",
      role: "viewer",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
      status: "invited",
      joinedAt: "2026-04-02",
    },
  ],
  templates: {
    shortlist: "Hi {{name}},\n\nWe have reviewed your application for {{role}} at {{company}}. Your background in {{skills}} stood out to our engineering team with a match score of {{score}}%.\n\nWe are delighted to invite you to our next technical round. View your scorecard: {{report_link}}\n\nWarm regards,\nThe Talent Team",
    rejection: "Hi {{name}},\n\nThank you for taking the time to apply for {{role}} at {{company}}. While your technical background is commendable, our current requisitions require specialized experience in other architectures.\n\nWe have detailed your multi-dimensional benchmark report here: {{report_link}}\n\nBest wishes,\nThe Talent Team",
    review: "Hi {{name}},\n\nYour application for {{role}} is currently under peer evaluation by our senior technical staff. We expect to complete calibration within 48 hours.\n\nBest regards,\nTalentBench Operations",
  },
  rubrics: {
    experienceToleranceYears: 1,
    strictKeywordMatching: true,
    autoShortlistScoreThreshold: 80,
    autoRejectScoreThreshold: 45,
    enableDeterministicTracers: true,
  },
  llm: {
    provider: "gemini" as "gemini" | "omniroute",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    omnirouteBaseUrl: process.env.OMNIROUTE_BASE_URL || "http://localhost:20128/v1",
    omnirouteApiKey: process.env.OMNIROUTE_API_KEY || "sk-omniroute-key",
    omnirouteModel: process.env.OMNIROUTE_MODEL || "kamalai",
    omnirouteFallbackModels: [] as string[],
    tokenThreshold: 12000,
    gemmaModel: "gemma-4-31b-it",
    gemmaRpm: 30,
    gemmaTpm: 16000,
    geminiFlashLiteModel: "gemini-3.5-flash-lite",
    geminiFlashLiteRpm: 15,
    geminiFlashLiteTpm: 250000,
  },
};

export async function GET() {
  try {
    return NextResponse.json({ settings: settingsStore });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { org, templates, rubrics, llm, newMember, removeMemberId } = body;

    if (org) {
      settingsStore.org = { ...settingsStore.org, ...org };
    }
    if (templates) {
      settingsStore.templates = { ...settingsStore.templates, ...templates };
    }
    if (rubrics) {
      settingsStore.rubrics = { ...settingsStore.rubrics, ...rubrics };
    }
    if (llm) {
      settingsStore.llm = { ...settingsStore.llm, ...llm };
      updateGatewayConfig({
        provider: settingsStore.llm.provider,
        geminiApiKey: settingsStore.llm.geminiApiKey,
        omnirouteBaseUrl: settingsStore.llm.omnirouteBaseUrl,
        omnirouteApiKey: settingsStore.llm.omnirouteApiKey,
        omnirouteModel: settingsStore.llm.omnirouteModel,
      });
    }
    if (newMember) {
      settingsStore.members.push({
        id: `m-${Date.now()}`,
        name: newMember.name || newMember.email.split("@")[0],
        email: newMember.email,
        role: newMember.role || "recruiter",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80",
        status: "invited",
        joinedAt: new Date().toISOString().split("T")[0],
      });
      settingsStore.org.seatsUsed += 1;
    }
    if (removeMemberId) {
      settingsStore.members = settingsStore.members.filter((m) => m.id !== removeMemberId);
      settingsStore.org.seatsUsed = Math.max(1, settingsStore.org.seatsUsed - 1);
    }

    return NextResponse.json({ success: true, settings: settingsStore });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
