import { NextResponse } from "next/server";
import { llmGateway } from "@/lib/ai/llm-gateway";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await llmGateway.testConnection(body);
    return NextResponse.json({ success: true, test: result });
  } catch (err: any) {
    console.error("Error running test-llm connection:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute test connection" },
      { status: 500 }
    );
  }
}

