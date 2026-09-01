'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Plus, Briefcase, Users, MoreVertical, Trash2, Copy,
  FileText, Upload, Sparkles, Loader2, RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { GlowButton } from '@/components/glow-button';
import { Stagger, StaggerItem } from '@/components/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Role } from '@/lib/types';

export default function RolesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.getRoles(),
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [employmentType, setEmploymentType] = useState<'Full-time' | 'Part-time' | 'Contract' | 'Internship'>('Full-time');
  const [description, setDescription] = useState('');
  const [parsingFile, setParsingFile] = useState(false);
  const [polishingJD, setPolishingJD] = useState(false);
  const [rawDescriptionBackup, setRawDescriptionBackup] = useState<string | null>(null);

  async function handlePolishJD() {
    if (!description.trim() || description.trim().length < 15) {
      toast.error('Please enter or upload a job description first');
      return;
    }

    setPolishingJD(true);
    try {
      const res = await api.polishJobDescription(description);
      if (res?.data?.polished_text) {
        setRawDescriptionBackup(description);
        setDescription(res.data.polished_text);
        if (res.data.tokens_saved_estimate > 0) {
          toast.success(
            `Job description polished! Removed unnecessary company fluff (~${res.data.tokens_saved_estimate} tokens saved)`,
          );
        } else {
          toast.success('Job description polished with AI');
        }
      }
    } catch {
      toast.error('Failed to polish job description');
    } finally {
      setPolishingJD(false);
    }
  }

  function handleUndoPolish() {
    if (rawDescriptionBackup) {
      setDescription(rawDescriptionBackup);
      setRawDescriptionBackup(null);
      toast.info('Reverted to original job description');
    }
  }

  async function handleDelete(id: string) {
    await api.deleteRole(id);
    queryClient.invalidateQueries({ queryKey: ['roles'] });
    toast.success('Role deleted');
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsingFile(true);
    try {
      // Plain text or markdown can be read directly client-side
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        setDescription(text.trim());
        if (!title) {
          const firstLine = text.split('\n')[0].replace(/^#+\s*/, '').trim();
          if (firstLine.length > 3 && firstLine.length < 60) setTitle(firstLine);
        }
        toast.success(`Extracted text from ${file.name}`);
        return;
      }

      // For PDF, DOCX, DOC: parse through backend document extraction
      const res = await api.parseJobDescription(file);
      if (res?.data?.text && res.data.text.trim().length > 0) {
        setDescription(res.data.text.trim());
        if (!title && res.data.suggested_title) {
          setTitle(res.data.suggested_title);
        }
        toast.success(`Extracted text from ${file.name}`);
      } else {
        toast.error(`Could not extract readable text from ${file.name}`);
      }
    } catch {
      toast.error(`Failed to parse ${file.name}`);
    } finally {
      setParsingFile(false);
      e.target.value = '';
    }
  }

  async function handleCreateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please provide a role title');
      return;
    }

    setCreating(true);
    try {
      const res = await api.createRole({
        title: title.trim(),
        department: 'General',
        location: 'Remote',
        employment_type: employmentType,
        description: description.trim() || 'Role requirements and job description pending.',
        status: 'active',
      });
      toast.success('Role and AI screening pipeline created');
      setCreateOpen(false);
      router.push(`/dashboard/roles/${res.data.id}`);
    } catch {
      toast.error('Failed to create role');
    } finally {
      setCreating(false);
    }
  }

  const roles = data?.data ?? [];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Roles</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your open positions, job descriptions, and screening pipelines</p>
        </div>
        <GlowButton onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Role
        </GlowButton>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : (
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <StaggerItem key={role.id}>
              <RoleListCard role={role} onDelete={handleDelete} />
            </StaggerItem>
          ))}
        </Stagger>
      )}

      {/* Create New Role Dialog with Job Description Input */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Sparkles className="h-5 w-5 text-primary" />
              Create Role & Add Job Description
            </DialogTitle>
            <DialogDescription>
              Add your Job Description (JD) to automatically benchmark applicants and configure screening cutoffs.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRole} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="role-title">Role Title *</Label>
                <Input
                  id="role-title"
                  placeholder="e.g., Senior Distributed Systems Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-background-elevated"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Employment Type</Label>
                <Select value={employmentType} onValueChange={(v: any) => setEmploymentType(v)}>
                  <SelectTrigger className="bg-background-elevated">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Job Description Textarea & File Upload Dropzone */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="role-jd" className="flex items-center gap-1.5 font-medium">
                  <FileText className="h-4 w-4 text-primary" />
                  Job Description (JD)
                </Label>
                <div className="flex items-center gap-2 sm:gap-3">
                  {rawDescriptionBackup && (
                    <button
                      type="button"
                      onClick={handleUndoPolish}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Revert to raw job description before polish"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Undo polish</span>
                    </button>
                  )}
                  {description.trim().length > 20 && (
                    <button
                      type="button"
                      onClick={handlePolishJD}
                      disabled={polishingJD || parsingFile}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary transition-all disabled:opacity-50 cursor-pointer"
                      title="Remove company backstory, perks, and legal fluff to save tokens"
                    >
                      {polishingJD ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Polishing with AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span>Polish with AI</span>
                        </>
                      )}
                    </button>
                  )}
                  <label
                    className={`flex items-center gap-1.5 text-xs text-primary ${
                      parsingFile ? 'opacity-70 cursor-wait' : 'cursor-pointer hover:underline'
                    }`}
                  >
                    {parsingFile ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Extracting text...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3 w-3" />
                        <span>Upload JD (.pdf, .docx, .txt)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc,.txt,.md"
                      className="hidden"
                      disabled={parsingFile}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>

              <Textarea
                id="role-jd"
                placeholder="Paste the full job description, required competencies, years of experience, and rubric expectations here..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (rawDescriptionBackup) setRawDescriptionBackup(null);
                }}
                rows={7}
                className="bg-background-elevated font-sans text-sm leading-relaxed resize-none"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <p>
                  AI will extract key skills, assess requirements, and establish the benchmark profile.
                </p>
                {description.trim().length > 20 && !polishingJD && !rawDescriptionBackup && (
                  <button
                    type="button"
                    onClick={handlePolishJD}
                    className="text-primary hover:underline inline-flex items-center gap-1 shrink-0 ml-2 cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3" /> Remove company fluff & polish
                  </button>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <GlowButton type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Create Role & Pipeline
              </GlowButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleListCard({ role, onDelete }: { role: Role; onDelete: (id: string) => void }) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
      <div className="glass glass-hover group h-full rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <Link href={`/dashboard/roles/${role.id}`} className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Briefcase className="h-5 w-5" />
              </div>
            </div>
            <h3 className="font-display text-lg font-bold leading-tight">{role.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {role.employment_type || 'Full-time'}</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {role.applicant_count.toLocaleString()}</span>
            </div>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Copy className="mr-2 h-4 w-4" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(role.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
          <Badge variant={role.status === 'active' ? 'default' : 'secondary'}>{role.status}</Badge>
          <span className="text-xs text-muted-foreground">{role.rounds.length} rounds</span>
        </div>
      </div>
    </motion.div>
  );
}
