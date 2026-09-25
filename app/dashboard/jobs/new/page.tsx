"use client";

import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PipelineCanvas, PipelineStageItem } from "@/components/pipeline/pipeline-canvas";
import { motion } from "motion/react";

export default function NewJobProfilePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minExperience, setMinExperience] = useState<number>(3);
  const [maxExperience, setMaxExperience] = useState<number>(7);
  const [loading, setLoading] = useState(false);

  const [stages, setStages] = useState<PipelineStageItem[]>([
    {
      type: "RESUME_SCREENING",
      title: "RESUME SCREENING",
      description: "",
      cutoff: 50,
      order: 0,
      config: JSON.stringify({
        cutoff: 50,
        inputType: "BULK_RESUME_OR_EXCEL",
        inputSpecText: "Bulk Resume Upload (PDF / DOCX / TXT) or Excel Sheet with column like 'resume_texts'.",
        outputSpecText: "Shortlisted candidates pool, automated rejection email bodies, and Comparative Benchmark ranking.",
      }),
    },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) { toast.error("Job title is required."); return; }
    if (!description.trim()) { toast.error("Job description is required."); return; }
    if (minExperience < 0 || maxExperience < minExperience) {
      toast.error("Maximum experience must be >= minimum."); return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          minExperience: Number(minExperience),
          maxExperience: Number(maxExperience),
          initialRounds: stages.map((s, i) => ({
            type: s.type,
            title: s.title,
            description: s.description || null,
            config: s.config || null,
            order: i,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create job profile."); setLoading(false); return; }
      toast.success("Job profile and pipeline initialized!");
      router.push(`/dashboard/jobs/${data.job.id}`);
    } catch {
      toast.error("Network error while creating profile.");
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "12px",
    background: "var(--surface)",
    border: "1px solid var(--outline)",
    padding: "11px 14px",
    fontSize: "14px",
    color: "var(--ink)",
    fontFamily: "DM Sans, system-ui, sans-serif",
    outline: "none",
    transition: "border-color 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--muted)",
    marginBottom: "6px",
  };

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Back link */}
      <Link
        href="/dashboard/jobs"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          color: "var(--muted)",
          textDecoration: "none",
          fontWeight: 500,
        }}
      >
        <ArrowLeft size={16} /> Back to Job Profiles
      </Link>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.04em", color: "var(--ink)", margin: "0 0 6px" }}>
          Create Job Profile &amp; Pipeline
        </h1>
        <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}>
          Define qualification boundaries and configure the connector evaluation pipeline.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Job Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "var(--surface-high)",
            border: "1px solid var(--outline)",
            borderRadius: "22px",
            padding: "28px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "var(--primary)", flexShrink: 0, display: "inline-block" }} />
            Role Specification
          </h2>

          <div>
            <label style={labelStyle}>Job Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Full Stack Engineer"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Job Description</label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail technical requirements, expected deliverables, tech stack..."
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          <div>
            <label style={labelStyle}>Required Years of Experience</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "var(--surface)", borderRadius: "14px", padding: "14px 16px", border: "1px solid var(--outline)" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Minimum (years)</span>
                <input
                  type="number"
                  required
                  min={0}
                  max={30}
                  value={minExperience}
                  onChange={(e) => setMinExperience(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{
                    display: "block",
                    marginTop: "8px",
                    width: "100%",
                    boxSizing: "border-box",
                    background: "var(--surface-high)",
                    border: "1px solid var(--outline)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "var(--primary)",
                    outline: "none",
                    fontFamily: "DM Sans, system-ui, sans-serif",
                    letterSpacing: "-0.04em",
                  }}
                />
              </div>
              <div style={{ background: "var(--surface)", borderRadius: "14px", padding: "14px 16px", border: "1px solid var(--outline)" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Maximum (years)</span>
                <input
                  type="number"
                  required
                  min={minExperience}
                  max={40}
                  value={maxExperience}
                  onChange={(e) => setMaxExperience(Math.max(minExperience, parseInt(e.target.value) || minExperience))}
                  style={{
                    display: "block",
                    marginTop: "8px",
                    width: "100%",
                    boxSizing: "border-box",
                    background: "var(--surface-high)",
                    border: "1px solid var(--outline)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#1a6098",
                    outline: "none",
                    fontFamily: "DM Sans, system-ui, sans-serif",
                    letterSpacing: "-0.04em",
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pipeline Canvas */}
        <PipelineCanvas stages={stages} onChange={setStages} isEditable={true} />

        {/* Submit actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <Link href="/dashboard/jobs" className="md-button md-button--text">
            Cancel
          </Link>
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="md-button md-button--filled"
          >
            {loading ? "Initializing…" : "Create Profile & Open Workspace"}
          </motion.button>
        </div>
      </form>
    </div>
  );
}
