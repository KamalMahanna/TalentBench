"use client";

import React, { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Trash2, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";

interface JobProfileItem {
  id: string;
  title: string;
  description: string;
  minExperience: number;
  maxExperience: number;
  _count: {
    pipeline: number;
    candidates: number;
  };
  pipeline: { id: string; type: string; title: string }[];
  createdAt: string;
}

export default function JobsListPage() {
  const [jobs, setJobs] = useState<JobProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobToDelete, setJobToDelete] = useState<JobProfileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchJobs = () => {
    fetch("/api/jobs")
      .then((res) => res.json())
      .then((data) => {
        if (data.jobs) setJobs(data.jobs);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleOpenDeleteModal = (job: JobProfileItem) => {
    setJobToDelete(job);
  };

  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobToDelete.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to delete profile.");
        setIsDeleting(false);
        return;
      }

      toast.success(`Job profile "${jobToDelete.title}" deleted.`);
      setJobs((prev) => prev.filter((j) => j.id !== jobToDelete.id));
      setJobToDelete(null);
    } catch (err) {
      toast.error("Network error while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            style={{ color: "var(--ink)", margin: "24px 0 0 0" }}
            className="text-2xl sm:text-3xl font-bold tracking-tight"
          >
            Job Profiles &amp; Hiring Rounds
          </h1>
          <p
            style={{ color: "var(--muted)", marginTop: "6px" }}
            className="text-xs sm:text-sm"
          >
            Manage your open requisitions, mandatory experience parameters, and hiring rounds.
          </p>
        </div>
        <Link href="/dashboard/jobs/new">
          <button className="md-button md-button--filled inline-flex items-center gap-2">
            Add Job Profile
            <ArrowRight size={16} />
          </button>
        </Link>
      </div>

      {loading ? (
        <div
          style={{ color: "var(--muted)", borderColor: "var(--outline)", background: "var(--surface)" }}
          className="p-16 text-center text-xs rounded-3xl border"
        >
          Loading job profiles...
        </div>
      ) : jobs.length === 0 ? (
        <div
          style={{ borderColor: "var(--outline)", background: "var(--surface)" }}
          className="p-16 text-center rounded-3xl border border-dashed"
        >
          <Briefcase size={40} style={{ color: "var(--muted)" }} className="mx-auto mb-3" />
          <h3 style={{ color: "var(--ink)" }} className="text-lg font-semibold">
            No Job Profiles Configured
          </h3>
          <p style={{ color: "var(--muted)" }} className="text-xs mt-1 max-w-sm mx-auto">
            Mandatory criteria: Add job description and minimum-maximum experience range to deploy your automated screening rounds.
          </p>
          <div className="mt-6">
            <Link href="/dashboard/jobs/new">
              <button className="md-button md-button--filled inline-flex items-center gap-2">
                Create First Profile
                <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                background: "var(--surface)",
                borderColor: "var(--outline)",
              }}
              className="rounded-3xl border shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div
                style={{ background: "var(--surface-high)", borderColor: "var(--outline)" }}
                className="rounded-3xl p-6 sm:p-7 border"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 style={{ color: "var(--ink)" }} className="text-xl font-bold tracking-tight">
                        {job.title}
                      </h2>
                      <Badge variant="ice">
                        Experience: {job.minExperience} - {job.maxExperience} Years
                      </Badge>
                    </div>

                    <div style={{ color: "var(--muted)" }} className="flex flex-wrap items-center gap-3 text-xs">
                      <span>Created {formatDate(job.createdAt)}</span>
                      <span className="w-1 h-1 rounded-full bg-[var(--outline)]" />
                      <span className="flex items-center gap-1.5">
                        <Users size={14} style={{ color: "var(--primary)" }} />
                        <strong style={{ color: "var(--ink)" }}>{job._count.candidates}</strong> Candidates
                      </span>
                    </div>
                  </div>

                  {/* Right side CTAs: Open Workspace or Delete */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                    <Link href={`/dashboard/jobs/${job.id}`}>
                      <button className="md-button md-button--filled inline-flex items-center gap-2 text-sm">
                        Rounds &amp; Candidates
                        <ArrowRight size={14} />
                      </button>
                    </Link>
                    <button
                      onClick={() => handleOpenDeleteModal(job)}
                      className="p-2.5 rounded-xl transition-all disabled:opacity-50 hover:bg-rose-500/20 cursor-pointer"
                      style={{
                        background: "rgba(239,68,68,0.1)",
                        color: "#f87171",
                        border: "1px solid rgba(239,68,68,0.2)",
                      }}
                      title="Delete Job Profile"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Themed Confirmation Modal */}
      {jobToDelete && (
        <ConfirmationModal
          isOpen={Boolean(jobToDelete)}
          onClose={() => {
            if (!isDeleting) setJobToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Job Profile"
          itemName={jobToDelete.title}
          itemTypeLabel="Job Requisition"
          description={
            <span>
              Are you sure you want to permanently delete <strong>{jobToDelete.title}</strong>? All configured hiring rounds, automated screening criteria, and {jobToDelete._count.candidates} candidate evaluation record{jobToDelete._count.candidates === 1 ? "" : "s"} will be permanently removed.
            </span>
          }
          warningNote="This action cannot be undone. All candidate scoring data and round results for this role will be deleted immediately."
          confirmText="Delete Profile"
          cancelText="Cancel"
          variant="danger"
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
